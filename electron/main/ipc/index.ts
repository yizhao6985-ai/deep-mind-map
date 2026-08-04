import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { fail, fromUnknown, ok } from '../result'
import * as settings from '../services/settings'
import * as secrets from '../services/secrets'
import * as library from '../services/library'
import * as ai from '../services/ai'
import * as agentChats from '../services/agent-chats'
import * as attachments from '../services/attachments'
import * as exportSvc from '../services/export'
import * as github from '../services/github-sync'
import * as githubAuth from '../services/github-auth'
import { resolveModelCapabilities } from '@shared/ai/modelCapabilities'
import { getDefaultLibraryRoot, getLibraryRoot } from '../paths'
import type {
  AiConversation,
  AppSettings,
  ConflictResolution,
  MindMapFile
} from '@shared/types/domain'

function codeOf(e: unknown): string | undefined {
  return (e as { code?: string })?.code
}

export function registerIpc(): void {
  ipcMain.handle('settings:get', async () => {
    try {
      return ok(settings.readSettings())
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('settings:set', async (_e, patch: Partial<AppSettings>) => {
    try {
      return ok(settings.patchSettings(patch))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('secrets:set', async (_e, key: 'ai.apiKey', value: string) => {
    try {
      if (key !== 'ai.apiKey') {
        return fail('VALIDATION', '不支持的密钥类型')
      }
      secrets.setSecret(key, value)
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('secrets:has', async (_e, key: 'ai.apiKey') => {
    try {
      if (key !== 'ai.apiKey') {
        return fail('VALIDATION', '不支持的密钥类型')
      }
      return ok(secrets.hasSecret(key))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('secrets:delete', async (_e, key: 'ai.apiKey') => {
    try {
      if (key !== 'ai.apiKey') {
        return fail('VALIDATION', '不支持的密钥类型')
      }
      secrets.deleteSecret(key)
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:list', async () => {
    try {
      return ok(library.listLibrary())
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:readMap', async (_e, id: string) => {
    try {
      return ok(library.readMap(id))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'NOT_FOUND' || c === 'SCHEMA_INCOMPATIBLE') {
        return fail(c as 'NOT_FOUND', e instanceof Error ? e.message : '读取失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:writeMap', async (_e, file: MindMapFile) => {
    try {
      return ok(library.writeMap(file))
    } catch (e) {
      return fromUnknown(e, '保存失败')
    }
  })

  ipcMain.handle('library:createMap', async (_e, title: string, folderId?: string | null) => {
    try {
      return ok(library.createMap(title, folderId ?? null))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:deleteMap', async (_e, id: string) => {
    try {
      library.deleteMap(id)
      return ok({ id })
    } catch (e) {
      return fail('NOT_FOUND', e instanceof Error ? e.message : '删除失败')
    }
  })

  ipcMain.handle('library:renameMap', async (_e, id: string, title: string) => {
    try {
      return ok(library.renameMap(id, title))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:createFolder', async (_e, name: string, parentId?: string | null) => {
    try {
      return ok({ id: library.createFolder(name, parentId ?? null) })
    } catch (e) {
      const c = codeOf(e)
      if (c === 'VALIDATION' || c === 'NOT_FOUND') {
        return fail(c as 'VALIDATION', e instanceof Error ? e.message : '创建文件夹失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:renameFolder', async (_e, id: string, name: string) => {
    try {
      return ok(library.renameFolder(id, name))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'VALIDATION' || c === 'NOT_FOUND') {
        return fail(c as 'VALIDATION', e instanceof Error ? e.message : '重命名失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:deleteFolder', async (_e, id: string) => {
    try {
      library.deleteFolder(id)
      return ok({ id })
    } catch (e) {
      const c = codeOf(e)
      if (c === 'NOT_FOUND') {
        return fail('NOT_FOUND', e instanceof Error ? e.message : '删除失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:moveFolder', async (_e, id: string, parentId: string | null) => {
    try {
      return ok(library.moveFolder(id, parentId))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'VALIDATION' || c === 'NOT_FOUND') {
        return fail(c as 'VALIDATION', e instanceof Error ? e.message : '移动失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('library:moveMap', async (_e, id: string, folderId: string | null) => {
    try {
      return ok(library.moveMap(id, folderId))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'VALIDATION' || c === 'NOT_FOUND') {
        return fail(c as 'VALIDATION', e instanceof Error ? e.message : '移动失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('ai:test', async () => {
    try {
      return ok(await ai.testConnection())
    } catch (e) {
      const c = codeOf(e)
      if (c === 'UNAUTHORIZED' || c === 'TIMEOUT' || c === 'NETWORK' || c === 'NOT_FOUND' || c === 'VALIDATION') {
        return fail(c as 'UNAUTHORIZED', e instanceof Error ? e.message : '连接失败')
      }
      return fromUnknown(e, '连接失败')
    }
  })

  ipcMain.handle('ai:complete', async (_e, action) => {
    try {
      return ok(await ai.complete(action))
    } catch (e) {
      const c = codeOf(e)
      if (
        c === 'UNAUTHORIZED' ||
        c === 'TIMEOUT' ||
        c === 'NETWORK' ||
        c === 'NOT_FOUND' ||
        c === 'VALIDATION' ||
        c === 'CANCELLED'
      ) {
        return fail(c as 'UNAUTHORIZED', e instanceof Error ? e.message : 'AI 请求失败')
      }
      return fromUnknown(e, 'AI 请求失败')
    }
  })

  ipcMain.handle('ai:abort', async () => {
    return ok(ai.abortActiveAi())
  })

  ipcMain.handle('ai:capabilities', async () => {
    try {
      const s = settings.readSettings()
      return ok({
        ...resolveModelCapabilities(s.ai.model, s.ai.providerType),
        model: s.ai.model,
        providerType: s.ai.providerType
      })
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('agentChats:list', async (_e, mapId: string) => {
    try {
      return ok(agentChats.listConversations(mapId))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('agentChats:get', async (_e, mapId: string, conversationId: string) => {
    try {
      return ok(agentChats.getConversation(mapId, conversationId))
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('agentChats:upsert', async (_e, conversation: AiConversation) => {
    try {
      agentChats.upsertConversation(conversation)
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('agentChats:setActive', async (_e, mapId: string, conversationId: string | null) => {
    try {
      agentChats.setActive(mapId, conversationId)
      return ok(true as const)
    } catch (e) {
      const c = codeOf(e)
      if (c === 'NOT_FOUND') return fail('NOT_FOUND', e instanceof Error ? e.message : '对话不存在')
      return fromUnknown(e)
    }
  })

  ipcMain.handle('agentChats:delete', async (_e, mapId: string, conversationId: string) => {
    try {
      agentChats.deleteConversation(mapId, conversationId)
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('attachments:read', async (_e, filePath: string) => {
    try {
      return ok(attachments.readAttachment(filePath))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'VALIDATION' || c === 'NOT_FOUND') {
        return fail(c as 'VALIDATION', e instanceof Error ? e.message : '读取素材失败')
      }
      return fromUnknown(e, '读取素材失败')
    }
  })

  ipcMain.handle('export:write', async (_e, args) => {
    try {
      const path = await exportSvc.saveExport(args)
      return ok({ path })
    } catch (e) {
      if (codeOf(e) === 'CANCELLED') return fail('CANCELLED', '已取消')
      return fromUnknown(e)
    }
  })

  ipcMain.handle('import:openDmm', async () => {
    try {
      return ok(await exportSvc.openDmmFile())
    } catch (e) {
      if (codeOf(e) === 'SCHEMA_INCOMPATIBLE') {
        return fail('SCHEMA_INCOMPATIBLE', e instanceof Error ? e.message : '格式不兼容')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('import:openMarkdown', async () => {
    try {
      return ok(await exportSvc.openMarkdownFile())
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('dialog:open', async (_e, filters, multi?: boolean) => {
    const win = BrowserWindow.getFocusedWindow()
    const properties: Array<'openFile' | 'multiSelections'> = multi
      ? ['openFile', 'multiSelections']
      : ['openFile']
    const { canceled, filePaths } = await (win
      ? dialog.showOpenDialog(win, { properties, filters })
      : dialog.showOpenDialog({ properties, filters }))
    return ok(canceled || filePaths.length === 0 ? null : filePaths)
  })

  ipcMain.handle('dialog:save', async (_e, defaultPath: string, filters) => {
    const win = BrowserWindow.getFocusedWindow()
    const { canceled, filePath } = await (win
      ? dialog.showSaveDialog(win, { defaultPath, filters })
      : dialog.showSaveDialog({ defaultPath, filters }))
    return ok(canceled ? null : filePath ?? null)
  })

  ipcMain.handle('github:authStatus', async () => {
    try {
      return ok(await githubAuth.getAuthStatus())
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('github:connect', async () => {
    try {
      return ok(await githubAuth.connectWithDeviceFlow())
    } catch (e) {
      const c = codeOf(e)
      if (
        c === 'UNAUTHORIZED' ||
        c === 'VALIDATION' ||
        c === 'CANCELLED' ||
        c === 'TIMEOUT' ||
        c === 'NETWORK'
      ) {
        return fail(c, e instanceof Error ? e.message : '授权失败')
      }
      return fromUnknown(e, '授权失败')
    }
  })

  ipcMain.handle('github:cancelConnect', async () => {
    try {
      githubAuth.cancelDeviceAuth()
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('github:disconnect', async () => {
    try {
      await githubAuth.disconnect()
      return ok(true as const)
    } catch (e) {
      return fromUnknown(e)
    }
  })

  ipcMain.handle('github:test', async () => {
    try {
      return ok(await github.testGitHub())
    } catch (e) {
      const c = codeOf(e)
      if (c === 'UNAUTHORIZED' || c === 'FORBIDDEN' || c === 'NOT_FOUND' || c === 'VALIDATION') {
        return fail(c as 'UNAUTHORIZED', e instanceof Error ? e.message : '连接失败')
      }
      return fromUnknown(e)
    }
  })

  ipcMain.handle('github:push', async () => {
    try {
      return ok(await github.pushAll())
    } catch (e) {
      const c = codeOf(e)
      if (c === 'UNAUTHORIZED' || c === 'FORBIDDEN' || c === 'NOT_FOUND' || c === 'VALIDATION') {
        return fail(c as 'UNAUTHORIZED', e instanceof Error ? e.message : '推送失败')
      }
      return fromUnknown(e, '推送失败')
    }
  })

  ipcMain.handle('github:pull', async (_e, resolutions?: Record<string, ConflictResolution>) => {
    try {
      return ok(await github.pullAll(resolutions ?? {}))
    } catch (e) {
      const c = codeOf(e)
      if (c === 'UNAUTHORIZED' || c === 'FORBIDDEN' || c === 'NOT_FOUND' || c === 'VALIDATION') {
        return fail(c as 'UNAUTHORIZED', e instanceof Error ? e.message : '拉取失败')
      }
      return fromUnknown(e, '拉取失败')
    }
  })

  ipcMain.handle('app:getPaths', async () => {
    try {
      const s = settings.readSettings()
      return ok({
        libraryRoot: getLibraryRoot(s.libraryPath),
        userData: app.getPath('userData'),
        defaultLibrary: getDefaultLibraryRoot()
      })
    } catch (e) {
      return fromUnknown(e)
    }
  })
}
