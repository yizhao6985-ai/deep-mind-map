export type MapStyle = 'classic' | 'compact' | 'card'

export type MindNode = {
  id: string
  parentId: string | null
  text: string
  x: number
  y: number
  color: string | null
  collapsed: boolean
  order: number
}

export type MindMap = {
  id: string
  title: string
  mapStyle: MapStyle
  folderId: string | null
  nodes: MindNode[]
}

export type MindMapFile = {
  schemaVersion: 1
  app: 'deep-mind-map'
  updatedAt: string
  exportedAt?: string
  map: MindMap
}

export type LibraryFolder = {
  id: string
  name: string
  parentId: string | null
}

export type LibraryMapMeta = {
  id: string
  title: string
  folderId: string | null
  updatedAt: string
  relativePath: string
}

export type LibraryTree = {
  folders: LibraryFolder[]
  maps: LibraryMapMeta[]
}

export type AiProviderType = 'openai-compatible' | 'anthropic' | 'ollama'

export type AiSettings = {
  providerType: AiProviderType
  /** OpenAI 兼容 Base URL，或 Anthropic 可覆盖的 API Base，或 Ollama Host */
  baseUrl: string
  model: string
  temperature: number
}

export type GitHubSettings = {
  owner: string
  repo: string
  branch: string
  displayName: string
}

export type GitHubDeviceCode = {
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export type GitHubAuthStatus = {
  connected: boolean
  login: string | null
}

export type GitHubRepoSummary = {
  fullName: string
  owner: string
  name: string
  private: boolean
  defaultBranch: string
}

export type ThemeMode = 'system' | 'light' | 'dark'

export type AppSettings = {
  schemaVersion: 1
  libraryPath: string | null
  locale: 'zh-CN'
  onboardingCompleted: boolean
  themeMode: ThemeMode
  ai: AiSettings
  github: GitHubSettings
  recentMapIds: string[]
}

export type DmmErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'IO'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SCHEMA_INCOMPATIBLE'
  | 'CONFLICT'
  | 'CANCELLED'
  | 'UNKNOWN'

export type DmmResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: DmmErrorCode; message: string }

export type AiAttachmentKind = 'text' | 'image'

export type AiAttachment = {
  id: string
  name: string
  kind: AiAttachmentKind
  mimeType: string
  size: number
  /** 文本素材正文（截断后） */
  text?: string
  /** 图片 base64（无 data: 前缀），仅 vision 模型使用 */
  base64?: string
}

/** 持久化/历史中的轻量附件引用（不含大图 base64） */
export type AiAttachmentRef = {
  id: string
  name: string
  kind: AiAttachmentKind
  mimeType: string
  size: number
  textPreview?: string
}

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
  attachments?: AiAttachmentRef[]
}

export type AiAgentStepStatus = 'running' | 'done' | 'error'

export type AiAgentStep = {
  id: string
  toolName: string
  label: string
  status: AiAgentStepStatus
  detail?: string
}

export type AiUiMessage = AiChatMessage & {
  id: string
  opsApplied?: string[]
  /** Agent 工具调用等中间步骤（执行过程） */
  steps?: AiAgentStep[]
  createdAt: string
}

/** 主进程 → 渲染进程：AI agent 执行过程事件 */
export type AiAgentProgress =
  | { type: 'status'; status: 'started' | 'thinking' | 'fallback' }
  | {
      type: 'tool-start'
      id: string
      toolName: string
      label: string
      detail?: string
    }
  | {
      type: 'tool-end'
      id: string
      label?: string
      detail?: string
      ok?: boolean
    }
  | { type: 'text-delta'; delta: string }

export type AiConversation = {
  id: string
  mapId: string
  title: string
  createdAt: string
  updatedAt: string
  messages: AiUiMessage[]
}

export type AiConversationIndex = {
  schemaVersion: 1
  mapId: string
  activeId: string | null
  conversations: AiConversation[]
}

export type AiModelCapabilities = {
  textFiles: boolean
  images: boolean
  maxTextBytes: number
  maxImageBytes: number
}

export type AiTreeDraft = {
  title?: string
  rootText: string
  children: AiTreeNode[]
}

export type AiTreeNode = {
  id?: string
  text: string
  children?: AiTreeNode[]
}

export type AiAgentOp =
  | { type: 'none' }
  | { type: 'replaceMap'; draft: AiTreeDraft }
  | { type: 'expandNode'; nodeId: string; children: AiTreeNode[] }
  | { type: 'updateNodeText'; nodeId: string; text: string }
  | { type: 'addChild'; parentId: string; text: string; nodeId?: string }
  | { type: 'deleteNode'; nodeId: string }

export type AiAgentResponse = {
  reply: string
  operations: AiAgentOp[]
}

export type AiMapNodeSnap = {
  id: string
  parentId: string | null
  text: string
  order: number
}

/** Ask：只回答；Agent：可读写思维导图 */
export type AiChatMode = 'ask' | 'agent'

export type AiAction =
  | { type: 'generateFromTopic'; topic: string }
  | { type: 'generateFromNotes'; text: string }
  | { type: 'expandNode'; nodeText: string; mapTitle: string }
  | { type: 'explainNode'; nodeText: string }
  | { type: 'simplifyNode'; nodeText: string }
  | {
      type: 'agentChat'
      message: string
      history: AiChatMessage[]
      attachments?: AiAttachment[]
      mapTitle: string
      mapNodes: AiMapNodeSnap[]
      /** 默认 agent；ask 仅只读工具、不改图 */
      mode?: AiChatMode
    }

export type SyncConflict = {
  relativePath: string
  mapId: string
  localUpdatedAt: string | null
  remoteUpdatedAt: string | null
}

export type SyncProgress = {
  current: number
  total: number
  path: string
}

export type SyncRunResult = {
  direction: 'push' | 'pull'
  written: number
  skipped: number
  conflicts: SyncConflict[]
}

export type ConflictResolution = 'keep-local' | 'use-remote' | 'skip'
