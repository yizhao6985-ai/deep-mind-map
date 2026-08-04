import { BrowserWindow, shell } from 'electron'
import { Octokit } from '@octokit/rest'
import type { GitHubDeviceCode } from '@shared/types/domain'
import { getGitHubOAuthClientId, GITHUB_OAUTH_SCOPES } from '../github-oauth-config'
import { setSecret, getSecret, deleteSecret, hasSecret } from './secrets'
import { patchSettings, readSettings } from './settings'

type DeviceStartResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

type TokenPollResponse = {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
  interval?: number
}

let authAbort: AbortController | null = null

function emitAuthCode(info: GitHubDeviceCode): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('github:auth-code', info)
  }
}

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'DeepMindMap'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(text || `GitHub 授权请求失败（${res.status}）`)
    ;(err as Error & { code: string }).code = res.status === 401 ? 'UNAUTHORIZED' : 'NETWORK'
    throw err
  }
  return (await res.json()) as T
}

export function isGitHubConnected(): boolean {
  return hasSecret('github.token')
}

export async function getAuthStatus(): Promise<{
  connected: boolean
  login: string | null
}> {
  const token = getSecret('github.token')
  if (!token) {
    return { connected: false, login: null }
  }
  const cached = readSettings().github.displayName
  try {
    const octokit = new Octokit({ auth: token })
    const { data } = await octokit.users.getAuthenticated()
    if (data.login !== cached) {
      patchSettings({ github: { ...readSettings().github, displayName: data.login } })
    }
    const { DEFAULT_SYNC_REPO_NAME, ensureDefaultSyncRepo } = await import('./github-sync')
    const g = readSettings().github
    if (!g.repo || g.repo !== DEFAULT_SYNC_REPO_NAME) {
      await ensureDefaultSyncRepo(data.login)
    }
    return { connected: true, login: data.login }
  } catch {
    return { connected: true, login: cached || null }
  }
}

export async function disconnect(): Promise<void> {
  cancelDeviceAuth()
  deleteSecret('github.token')
  const g = readSettings().github
  patchSettings({
    github: { ...g, owner: '', repo: '', branch: 'main', displayName: '' }
  })
}

export function cancelDeviceAuth(): void {
  authAbort?.abort()
  authAbort = null
}

/**
 * Device Flow：发起授权，向渲染进程推送验证码，打开浏览器，轮询直到完成。
 * 成功后将 access_token 写入 secrets，并回填 displayName。
 */
export async function connectWithDeviceFlow(): Promise<{ login: string; repo: string }> {
  const clientId = getGitHubOAuthClientId()
  if (!clientId) {
    const err = new Error(
      '未配置 GitHub OAuth Client ID。请设置环境变量 DMM_GITHUB_CLIENT_ID，或在 github-oauth-config.ts 填入已启用 Device Flow 的 Client ID。'
    )
    ;(err as Error & { code: string }).code = 'VALIDATION'
    throw err
  }

  cancelDeviceAuth()
  authAbort = new AbortController()
  const signal = authAbort.signal

  let start: DeviceStartResponse
  try {
    start = await postForm<DeviceStartResponse>('https://github.com/login/device/code', {
      client_id: clientId,
      scope: GITHUB_OAUTH_SCOPES
    })
  } catch (e) {
    authAbort = null
    throw e
  }

  const deviceInfo: GitHubDeviceCode = {
    userCode: start.user_code,
    verificationUri: start.verification_uri,
    expiresIn: start.expires_in,
    interval: start.interval
  }
  emitAuthCode(deviceInfo)

  const openUri = start.verification_uri_complete || start.verification_uri
  void shell.openExternal(openUri)

  const deadline = Date.now() + start.expires_in * 1000
  let intervalMs = Math.max(start.interval, 5) * 1000

  try {
    while (Date.now() < deadline) {
      if (signal.aborted) {
        const err = new Error('已取消 GitHub 授权')
        ;(err as Error & { code: string }).code = 'CANCELLED'
        throw err
      }

      try {
        await sleep(intervalMs, signal)
      } catch {
        const err = new Error('已取消 GitHub 授权')
        ;(err as Error & { code: string }).code = 'CANCELLED'
        throw err
      }

      let poll: TokenPollResponse
      try {
        poll = await postForm<TokenPollResponse>('https://github.com/login/oauth/access_token', {
          client_id: clientId,
          device_code: start.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      } catch (e) {
        if (signal.aborted) {
          const err = new Error('已取消 GitHub 授权')
          ;(err as Error & { code: string }).code = 'CANCELLED'
          throw err
        }
        throw e
      }

      if (poll.access_token) {
        setSecret('github.token', poll.access_token)
        const octokit = new Octokit({ auth: poll.access_token })
        const { data } = await octokit.users.getAuthenticated()
        const g = readSettings().github
        patchSettings({ github: { ...g, displayName: data.login } })
        const { ensureDefaultSyncRepo } = await import('./github-sync')
        const repo = await ensureDefaultSyncRepo(data.login)
        return { login: data.login, repo: repo.fullName }
      }

      if (poll.error === 'authorization_pending') continue
      if (poll.error === 'slow_down') {
        intervalMs += 5000
        continue
      }
      if (poll.error === 'expired_token') {
        const err = new Error('授权码已过期，请重新连接')
        ;(err as Error & { code: string }).code = 'TIMEOUT'
        throw err
      }
      if (poll.error === 'access_denied') {
        const err = new Error('你已拒绝 GitHub 授权')
        ;(err as Error & { code: string }).code = 'CANCELLED'
        throw err
      }
      if (poll.error) {
        const err = new Error(poll.error_description || `GitHub 授权失败：${poll.error}`)
        ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
        throw err
      }
    }

    const err = new Error('授权超时，请重新连接')
    ;(err as Error & { code: string }).code = 'TIMEOUT'
    throw err
  } finally {
    authAbort = null
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error('aborted'), { code: 'CANCELLED' }))
      return
    }
    const t = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(Object.assign(new Error('aborted'), { code: 'CANCELLED' }))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
