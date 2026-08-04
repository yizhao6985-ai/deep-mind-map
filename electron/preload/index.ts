import { contextBridge, ipcRenderer } from 'electron'
import type { DmmApi } from '@shared/types/api'
import type {
  AiAgentProgress,
  ConflictResolution,
  GitHubDeviceCode,
  SyncProgress
} from '@shared/types/domain'

const api: DmmApi = {
  library: {
    list: () => ipcRenderer.invoke('library:list'),
    readMap: (id) => ipcRenderer.invoke('library:readMap', id),
    writeMap: (file) => ipcRenderer.invoke('library:writeMap', file),
    createMap: (title, folderId) => ipcRenderer.invoke('library:createMap', title, folderId),
    deleteMap: (id) => ipcRenderer.invoke('library:deleteMap', id),
    renameMap: (id, title) => ipcRenderer.invoke('library:renameMap', id, title),
    moveMap: (id, folderId) => ipcRenderer.invoke('library:moveMap', id, folderId),
    createFolder: (name, parentId) => ipcRenderer.invoke('library:createFolder', name, parentId),
    renameFolder: (id, name) => ipcRenderer.invoke('library:renameFolder', id, name),
    deleteFolder: (id) => ipcRenderer.invoke('library:deleteFolder', id),
    moveFolder: (id, parentId) => ipcRenderer.invoke('library:moveFolder', id, parentId)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch)
  },
  secrets: {
    set: (key, value) => ipcRenderer.invoke('secrets:set', key, value),
    has: (key) => ipcRenderer.invoke('secrets:has', key),
    delete: (key) => ipcRenderer.invoke('secrets:delete', key)
  },
  ai: {
    test: () => ipcRenderer.invoke('ai:test'),
    complete: (action) => ipcRenderer.invoke('ai:complete', action),
    abort: () => ipcRenderer.invoke('ai:abort'),
    capabilities: () => ipcRenderer.invoke('ai:capabilities'),
    onProgress: (cb: (p: AiAgentProgress) => void) => {
      const listener = (_: Electron.IpcRendererEvent, p: AiAgentProgress) => cb(p)
      ipcRenderer.on('ai:progress', listener)
      return () => ipcRenderer.removeListener('ai:progress', listener)
    }
  },
  agentChats: {
    list: (mapId) => ipcRenderer.invoke('agentChats:list', mapId),
    get: (mapId, conversationId) => ipcRenderer.invoke('agentChats:get', mapId, conversationId),
    upsert: (conversation) => ipcRenderer.invoke('agentChats:upsert', conversation),
    setActive: (mapId, conversationId) =>
      ipcRenderer.invoke('agentChats:setActive', mapId, conversationId),
    delete: (mapId, conversationId) => ipcRenderer.invoke('agentChats:delete', mapId, conversationId)
  },
  attachments: {
    read: (filePath) => ipcRenderer.invoke('attachments:read', filePath)
  },
  export: {
    write: (args) => ipcRenderer.invoke('export:write', args)
  },
  import: {
    openDmm: () => ipcRenderer.invoke('import:openDmm'),
    openMarkdown: () => ipcRenderer.invoke('import:openMarkdown')
  },
  dialog: {
    openFile: (filters, multi) => ipcRenderer.invoke('dialog:open', filters, multi),
    saveFile: (defaultPath, filters) => ipcRenderer.invoke('dialog:save', defaultPath, filters)
  },
  github: {
    authStatus: () => ipcRenderer.invoke('github:authStatus'),
    connect: () => ipcRenderer.invoke('github:connect'),
    cancelConnect: () => ipcRenderer.invoke('github:cancelConnect'),
    disconnect: () => ipcRenderer.invoke('github:disconnect'),
    test: () => ipcRenderer.invoke('github:test'),
    push: () => ipcRenderer.invoke('github:push'),
    pull: (resolutions) => ipcRenderer.invoke('github:pull', resolutions),
    onProgress: (cb: (p: SyncProgress) => void) => {
      const listener = (_: Electron.IpcRendererEvent, p: SyncProgress) => cb(p)
      ipcRenderer.on('github:progress', listener)
      return () => ipcRenderer.removeListener('github:progress', listener)
    },
    onAuthCode: (cb: (info: GitHubDeviceCode) => void) => {
      const listener = (_: Electron.IpcRendererEvent, info: GitHubDeviceCode) => cb(info)
      ipcRenderer.on('github:auth-code', listener)
      return () => ipcRenderer.removeListener('github:auth-code', listener)
    }
  },
  app: {
    platform: process.platform,
    getPaths: () => ipcRenderer.invoke('app:getPaths')
  }
}

contextBridge.exposeInMainWorld('dmm', api)

// silence unused
void 0 as unknown as ConflictResolution
