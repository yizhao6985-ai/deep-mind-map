import fs from 'fs'
import path from 'path'
import type { AiConversation, AiConversationIndex } from '@shared/types/domain'
import { ensureDir, libraryDir } from '../paths'
import { resolveRoot } from './settings'

function chatsDir(root: string): string {
  const dir = path.join(libraryDir(root), 'agent-chats')
  ensureDir(dir)
  return dir
}

function chatFilePath(mapId: string): string {
  const safe = mapId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(chatsDir(resolveRoot()), `${safe}.json`)
}

function emptyIndex(mapId: string): AiConversationIndex {
  return { schemaVersion: 1, mapId, activeId: null, conversations: [] }
}

export function readIndex(mapId: string): AiConversationIndex {
  const p = chatFilePath(mapId)
  if (!fs.existsSync(p)) return emptyIndex(mapId)
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as AiConversationIndex
    if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.conversations)) {
      return emptyIndex(mapId)
    }
    return {
      schemaVersion: 1,
      mapId,
      activeId: raw.activeId ?? null,
      conversations: raw.conversations.filter((c) => c && c.mapId === mapId)
    }
  } catch {
    return emptyIndex(mapId)
  }
}

export function writeIndex(index: AiConversationIndex): AiConversationIndex {
  const p = chatFilePath(index.mapId)
  // 持久化时去掉图片 base64，仅保留文本预览，控制体积
  const slim: AiConversationIndex = {
    ...index,
    conversations: index.conversations.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        attachments: m.attachments?.map((a) => ({
          id: a.id,
          name: a.name,
          kind: a.kind,
          mimeType: a.mimeType,
          size: a.size,
          textPreview: a.textPreview
        }))
      }))
    }))
  }
  fs.writeFileSync(p, JSON.stringify(slim, null, 2), 'utf8')
  return slim
}

export function listConversations(mapId: string): {
  activeId: string | null
  conversations: Pick<AiConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>[]
} {
  const index = readIndex(mapId)
  const conversations = [...index.conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
  return { activeId: index.activeId, conversations }
}

export function getConversation(mapId: string, conversationId: string): AiConversation | null {
  const index = readIndex(mapId)
  return index.conversations.find((c) => c.id === conversationId) ?? null
}

export function upsertConversation(conversation: AiConversation): AiConversationIndex {
  const index = readIndex(conversation.mapId)
  const i = index.conversations.findIndex((c) => c.id === conversation.id)
  if (i >= 0) index.conversations[i] = conversation
  else index.conversations.unshift(conversation)
  index.activeId = conversation.id
  return writeIndex(index)
}

export function setActive(mapId: string, conversationId: string | null): AiConversationIndex {
  const index = readIndex(mapId)
  if (conversationId && !index.conversations.some((c) => c.id === conversationId)) {
    const err = new Error('对话不存在')
    ;(err as Error & { code: string }).code = 'NOT_FOUND'
    throw err
  }
  index.activeId = conversationId
  return writeIndex(index)
}

export function deleteConversation(mapId: string, conversationId: string): AiConversationIndex {
  const index = readIndex(mapId)
  index.conversations = index.conversations.filter((c) => c.id !== conversationId)
  if (index.activeId === conversationId) {
    index.activeId = index.conversations[0]?.id ?? null
  }
  return writeIndex(index)
}
