import type {
  AiAction,
  AiAgentProgress,
  AiAgentResponse,
  AiAttachment,
  AiConversation,
  AiModelCapabilities,
  AiTreeDraft,
  AppSettings,
  ConflictResolution,
  DmmResult,
  GitHubAuthStatus,
  GitHubDeviceCode,
  LibraryTree,
  MindMapFile,
  SyncProgress,
  SyncRunResult
} from './domain'

export type DmmApi = {
  library: {
    list: () => Promise<DmmResult<LibraryTree>>
    readMap: (id: string) => Promise<DmmResult<MindMapFile>>
    writeMap: (file: MindMapFile) => Promise<DmmResult<MindMapFile>>
    createMap: (title: string, folderId?: string | null) => Promise<DmmResult<MindMapFile>>
    deleteMap: (id: string) => Promise<DmmResult<{ id: string }>>
    renameMap: (id: string, title: string) => Promise<DmmResult<MindMapFile>>
    moveMap: (id: string, folderId: string | null) => Promise<DmmResult<MindMapFile>>
    createFolder: (name: string, parentId?: string | null) => Promise<DmmResult<{ id: string }>>
    renameFolder: (id: string, name: string) => Promise<DmmResult<{ id: string; name: string; parentId: string | null }>>
    deleteFolder: (id: string) => Promise<DmmResult<{ id: string }>>
    moveFolder: (
      id: string,
      parentId: string | null
    ) => Promise<DmmResult<{ id: string; name: string; parentId: string | null }>>
  }
  settings: {
    get: () => Promise<DmmResult<AppSettings>>
    set: (patch: Partial<AppSettings>) => Promise<DmmResult<AppSettings>>
  }
  secrets: {
    set: (key: 'ai.apiKey', value: string) => Promise<DmmResult<true>>
    has: (key: 'ai.apiKey') => Promise<DmmResult<boolean>>
    delete: (key: 'ai.apiKey') => Promise<DmmResult<true>>
  }
  ai: {
    test: () => Promise<DmmResult<{ model: string; providerType?: string }>>
    complete: (
      action: AiAction
    ) => Promise<DmmResult<AiTreeDraft | { explanation: string } | AiAgentResponse>>
    abort: () => Promise<DmmResult<boolean>>
    capabilities: () => Promise<DmmResult<AiModelCapabilities & { model: string; providerType: string }>>
    onProgress: (cb: (p: AiAgentProgress) => void) => () => void
  }
  agentChats: {
    list: (mapId: string) => Promise<
      DmmResult<{
        activeId: string | null
        conversations: Pick<AiConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>[]
      }>
    >
    get: (mapId: string, conversationId: string) => Promise<DmmResult<AiConversation | null>>
    upsert: (conversation: AiConversation) => Promise<DmmResult<true>>
    setActive: (mapId: string, conversationId: string | null) => Promise<DmmResult<true>>
    delete: (mapId: string, conversationId: string) => Promise<DmmResult<true>>
  }
  attachments: {
    read: (filePath: string) => Promise<DmmResult<AiAttachment>>
  }
  export: {
    write: (args: {
      format: 'dmm' | 'markdown' | 'svg' | 'png' | 'pdf'
      defaultName: string
      content: string
      encoding?: 'utf8' | 'base64'
    }) => Promise<DmmResult<{ path: string }>>
  }
  import: {
    openDmm: () => Promise<DmmResult<MindMapFile | null>>
    openMarkdown: () => Promise<DmmResult<{ title: string; markdown: string } | null>>
  }
  dialog: {
    openFile: (
      filters?: { name: string; extensions: string[] }[],
      multi?: boolean
    ) => Promise<DmmResult<string[] | null>>
    saveFile: (
      defaultPath: string,
      filters?: { name: string; extensions: string[] }[]
    ) => Promise<DmmResult<string | null>>
  }
  github: {
    authStatus: () => Promise<DmmResult<GitHubAuthStatus>>
    connect: () => Promise<DmmResult<{ login: string; repo: string }>>
    cancelConnect: () => Promise<DmmResult<true>>
    disconnect: () => Promise<DmmResult<true>>
    test: () => Promise<DmmResult<{ fullName: string }>>
    push: () => Promise<DmmResult<SyncRunResult>>
    pull: (resolutions?: Record<string, ConflictResolution>) => Promise<DmmResult<SyncRunResult>>
    onProgress: (cb: (p: SyncProgress) => void) => () => void
    onAuthCode: (cb: (info: GitHubDeviceCode) => void) => () => void
  }
  app: {
    platform: string
    getPaths: () => Promise<DmmResult<{ libraryRoot: string; userData: string }>>
  }
}
