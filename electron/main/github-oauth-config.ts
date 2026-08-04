/**
 * GitHub OAuth App（Device Flow）Client ID。
 * Device Flow 不需要 client_secret，适合桌面端公开客户端。
 *
 * 注册步骤见 README「GitHub OAuth App」。
 * 可用环境变量 DMM_GITHUB_CLIENT_ID 覆盖（本地开发推荐）。
 */
const BUILTIN_CLIENT_ID = 'Ov23liX0Ju2W8h5fHrzG'

export function getGitHubOAuthClientId(): string {
  return (process.env.DMM_GITHUB_CLIENT_ID ?? BUILTIN_CLIENT_ID).trim()
}

export const GITHUB_OAUTH_SCOPES = 'repo read:user'
