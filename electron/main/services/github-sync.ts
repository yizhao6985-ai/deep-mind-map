import { BrowserWindow } from 'electron'
import { Octokit } from '@octokit/rest'
import type {
  ConflictResolution,
  GitHubRepoSummary,
  MindMapFile,
  SyncConflict,
  SyncRunResult
} from '@shared/types/domain'
import { parseMindMapFile } from '@shared/schema/mindmap'
import { getSecret } from './secrets'
import { patchSettings, readSettings } from './settings'
import * as library from './library'

/** 连接 GitHub 后自动创建 / 绑定的专用同步仓库（与开源仓库 deep-mind-map 区分） */
export const DEFAULT_SYNC_REPO_NAME = 'deep-mind-map-data'

function client(): Octokit {
  const token = getSecret('github.token')
  if (!token) {
    const err = new Error('请先连接 GitHub')
    ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
    throw err
  }
  return new Octokit({ auth: token })
}

function repoConfig() {
  const g = readSettings().github
  if (!g.owner || !g.repo) {
    const err = new Error('请先配置同步仓库')
    ;(err as Error & { code: string }).code = 'VALIDATION'
    throw err
  }
  return g
}

function toSummary(data: {
  full_name: string
  owner: { login: string }
  name: string
  private: boolean
  default_branch: string
}): GitHubRepoSummary {
  return {
    fullName: data.full_name,
    owner: data.owner.login,
    name: data.name,
    private: data.private,
    defaultBranch: data.default_branch
  }
}

function bindRepo(summary: GitHubRepoSummary, displayName?: string): GitHubRepoSummary {
  const g = readSettings().github
  patchSettings({
    github: {
      ...g,
      owner: summary.owner,
      repo: summary.name,
      branch: summary.defaultBranch || g.branch || 'main',
      ...(displayName !== undefined ? { displayName } : {})
    }
  })
  return summary
}

function mapError(e: unknown): never {
  const status = (e as { status?: number })?.status
  if (status === 401) {
    const err = new Error('授权无效或已过期，请重新连接 GitHub')
    ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
    throw err
  }
  if (status === 403) {
    const err = new Error('无权限写入该仓库，请检查授权范围与仓库访问')
    ;(err as Error & { code: string }).code = 'FORBIDDEN'
    throw err
  }
  if (status === 404) {
    const err = new Error('仓库或路径不存在，请检查同步仓库与分支')
    ;(err as Error & { code: string }).code = 'NOT_FOUND'
    throw err
  }
  throw e instanceof Error ? e : new Error(String(e))
}

export async function testGitHub(): Promise<{ fullName: string }> {
  const { owner, repo } = repoConfig()
  const octokit = client()
  try {
    const { data } = await octokit.repos.get({ owner, repo })
    return { fullName: data.full_name }
  } catch (e) {
    mapError(e)
  }
}

function emitProgress(current: number, total: number, path: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('github:progress', { current, total, path })
  }
}

export async function pushAll(): Promise<SyncRunResult> {
  const { owner, repo, branch } = repoConfig()
  const octokit = client()
  const items = library.listMapFilesForSync()
  let written = 0
  let i = 0
  for (const item of items) {
    i++
    const remotePath = item.relativePath.replace(/^\/+/, '')
    emitProgress(i, items.length, remotePath)
    const content = Buffer.from(JSON.stringify(item.file, null, 2), 'utf8').toString('base64')
    let sha: string | undefined
    try {
      const existing = await octokit.repos.getContent({ owner, repo, path: remotePath, ref: branch })
      if (!Array.isArray(existing.data) && existing.data.type === 'file') sha = existing.data.sha
    } catch (e) {
      if ((e as { status?: number }).status !== 404) mapError(e)
    }
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: remotePath,
        message: `sync: Deep Mind Map — ${item.file.map.title}`,
        content,
        branch,
        sha
      })
      written++
    } catch (e) {
      mapError(e)
    }
  }
  return { direction: 'push', written, skipped: 0, conflicts: [] }
}

async function listRemoteDmm(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<{ path: string; sha: string }[]> {
  const out: { path: string; sha: string }[] = []
  const walk = async (dir: string) => {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: dir === '.' ? '' : dir,
        ref: branch
      })
      if (!Array.isArray(data)) return
      for (const item of data) {
        if (item.type === 'dir') await walk(item.path)
        else if (item.type === 'file' && item.name.endsWith('.dmm.json')) {
          out.push({ path: item.path, sha: item.sha })
        }
      }
    } catch (e) {
      if ((e as { status?: number }).status === 404) return
      mapError(e)
    }
  }
  await walk('.')
  return out
}

export async function pullAll(
  resolutions: Record<string, ConflictResolution> = {}
): Promise<SyncRunResult> {
  const { owner, repo, branch } = repoConfig()
  const octokit = client()
  const remoteFiles = await listRemoteDmm(octokit, owner, repo, branch)
  const local = library.listMapFilesForSync()
  const localByRel = new Map(local.map((l) => [l.relativePath, l.file] as const))

  const conflicts: SyncConflict[] = []
  let written = 0
  let skipped = 0
  let i = 0

  for (const rf of remoteFiles) {
    i++
    emitProgress(i, remoteFiles.length, rf.path)
    const relativePath = rf.path

    let remoteFile: MindMapFile
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: rf.path, ref: branch })
      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) continue
      const text = Buffer.from(data.content, 'base64').toString('utf8')
      const parsed = parseMindMapFile(JSON.parse(text))
      if (!parsed.success) continue
      remoteFile = parsed.data
    } catch (e) {
      mapError(e)
    }

    const localFile = localByRel.get(relativePath)
    if (localFile && localFile.updatedAt !== remoteFile.updatedAt) {
      const resolution = resolutions[relativePath]
      if (!resolution) {
        conflicts.push({
          relativePath,
          mapId: remoteFile.map.id,
          localUpdatedAt: localFile.updatedAt,
          remoteUpdatedAt: remoteFile.updatedAt
        })
        continue
      }
      if (resolution === 'skip' || resolution === 'keep-local') {
        skipped++
        continue
      }
    }

    library.writeMapAtRelativePath(relativePath, remoteFile)
    written++
  }

  return { direction: 'pull', written, skipped, conflicts }
}

/**
 * 连接后确保有可用同步仓库：已正确绑定默认同步仓则沿用；
 * 否则查找或创建默认私有仓 `deep-mind-map-data`，并写入 settings。
 * 旧版曾误用开源仓名 `deep-mind-map`，此处会自动迁移。
 */
export async function ensureDefaultSyncRepo(login: string): Promise<GitHubRepoSummary> {
  const octokit = client()
  const g = readSettings().github

  // 仅沿用默认同步仓；勿沿用旧版绑定的 deep-mind-map（开源应用仓）
  if (g.owner && g.repo === DEFAULT_SYNC_REPO_NAME) {
    try {
      const { data } = await octokit.repos.get({ owner: g.owner, repo: g.repo })
      return bindRepo(toSummary(data), login)
    } catch {
      // 已配置仓库不可用，回退到查找 / 创建
    }
  }

  try {
    const { data } = await octokit.repos.get({ owner: login, repo: DEFAULT_SYNC_REPO_NAME })
    return bindRepo(toSummary(data), login)
  } catch (e) {
    if ((e as { status?: number }).status !== 404) mapError(e)
  }

  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: DEFAULT_SYNC_REPO_NAME,
      private: true,
      auto_init: true,
      description: 'Deep Mind Map sync'
    })
    return bindRepo(toSummary(data), login)
  } catch (e) {
    // 并发或已存在：再取一次
    const status = (e as { status?: number }).status
    if (status === 422) {
      const { data } = await octokit.repos.get({ owner: login, repo: DEFAULT_SYNC_REPO_NAME })
      return bindRepo(toSummary(data), login)
    }
    mapError(e)
  }
}
