import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachmentDialogFilters,
  conversationTitleFromMessage,
  createWelcomeMessage,
  resolveModelCapabilities,
  welcomeTextForMode
} from '@shared/ai/modelCapabilities'
import type {
  AiAgentProgress,
  AiAgentResponse,
  AiAgentStep,
  AiAttachment,
  AiAttachmentRef,
  AiChatMode,
  AiConversation,
  AiModelCapabilities,
  AiUiMessage
} from '@shared/types/domain'
import { useUiStore } from '@/app/uiStore'
import { useEditorStore } from '../canvas/editorStore'
import { AgentComposer } from './AgentComposer'
import { AgentHeader } from './AgentHeader'
import { AgentMessageList } from './AgentMessageList'
import { applyAgentOps } from './applyOps'

type ConversationMeta = Pick<AiConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>

function toAttachmentRef(a: AiAttachment): AiAttachmentRef {
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    mimeType: a.mimeType,
    size: a.size,
    textPreview: a.text ? a.text.slice(0, 200) : undefined
  }
}

function emptyConversation(mapId: string, mode: AiChatMode = 'agent'): AiConversation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    mapId,
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage(mode)]
  }
}

export function AiPanel() {
  const file = useEditorStore((s) => s.file)
  const aiBusy = useEditorStore((s) => s.aiBusy)
  const setAiBusy = useEditorStore((s) => s.setAiBusy)
  const setRightPanel = useUiStore((s) => s.setRightPanel)
  const showToast = useUiStore((s) => s.showToast)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AiUiMessage[]>([createWelcomeMessage('agent')])
  const [attachments, setAttachments] = useState<AiAttachment[]>([])
  const [mode, setMode] = useState<AiChatMode>('agent')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationMeta[]>([])
  const [capabilities, setCapabilities] = useState<AiModelCapabilities | null>(null)
  const [statusHint, setStatusHint] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const conversationsRef = useRef(conversations)
  const liveAssistantIdRef = useRef<string | null>(null)
  conversationsRef.current = conversations

  const mapId = file?.map.id ?? null

  const patchLiveAssistant = useCallback((updater: (msg: AiUiMessage) => AiUiMessage) => {
    const liveId = liveAssistantIdRef.current
    if (!liveId) return
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === liveId)
      if (idx < 0) return prev
      const next = [...prev]
      next[idx] = updater(next[idx])
      return next
    })
  }, [])

  const applyProgress = useCallback(
    (p: AiAgentProgress) => {
      if (p.type === 'status') {
        if (p.status === 'started') setStatusHint('开始处理…')
        else if (p.status === 'thinking') setStatusHint('思考中…')
        else if (p.status === 'fallback') setStatusHint('改用兼容模式…')
        return
      }

      if (p.type === 'tool-start') {
        setStatusHint(null)
        const step: AiAgentStep = {
          id: p.id,
          toolName: p.toolName,
          label: p.label,
          status: 'running',
          detail: p.detail
        }
        patchLiveAssistant((msg) => {
          const steps = [...(msg.steps ?? [])]
          const i = steps.findIndex((s) => s.id === step.id)
          if (i >= 0) steps[i] = step
          else steps.push(step)
          return { ...msg, steps }
        })
        return
      }

      if (p.type === 'tool-end') {
        patchLiveAssistant((msg) => {
          const steps = (msg.steps ?? []).map((s) =>
            s.id === p.id
              ? {
                  ...s,
                  status: (p.ok === false ? 'error' : 'done') as AiAgentStep['status'],
                  label: p.label ?? s.label,
                  detail: p.detail ?? s.detail
                }
              : s
          )
          return { ...msg, steps }
        })
        return
      }

      if (p.type === 'text-delta') {
        setStatusHint(null)
        patchLiveAssistant((msg) => ({
          ...msg,
          content: `${msg.content || ''}${p.delta}`
        }))
      }
    },
    [patchLiveAssistant]
  )

  useEffect(() => {
    return window.dmm.ai.onProgress(applyProgress)
  }, [applyProgress])

  const refreshList = useCallback(async (id: string) => {
    const res = await window.dmm.agentChats.list(id)
    if (res.ok) setConversations(res.data.conversations)
  }, [])

  const persistConversation = useCallback(
    (conv: AiConversation) => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
      persistTimer.current = setTimeout(() => {
        void window.dmm.agentChats.upsert(conv).then(() => void refreshList(conv.mapId))
      }, 280)
    },
    [refreshList]
  )

  useEffect(() => {
    if (!mapId) return
    let cancelled = false

    ;(async () => {
      const [capsRes, listRes] = await Promise.all([
        window.dmm.ai.capabilities(),
        window.dmm.agentChats.list(mapId)
      ])
      if (cancelled) return

      if (capsRes.ok) {
        setCapabilities(capsRes.data)
      } else {
        const settings = await window.dmm.settings.get()
        if (!cancelled && settings.ok) {
          setCapabilities(
            resolveModelCapabilities(settings.data.ai.model, settings.data.ai.providerType)
          )
        }
      }

      if (!listRes.ok) {
        const fresh = emptyConversation(mapId, 'agent')
        setConversationId(fresh.id)
        setMessages(fresh.messages)
        setAttachments([])
        setInput('')
        persistConversation(fresh)
        return
      }

      setConversations(listRes.data.conversations)
      const activeId = listRes.data.activeId
      if (activeId) {
        const got = await window.dmm.agentChats.get(mapId, activeId)
        if (cancelled) return
        if (got.ok && got.data) {
          setConversationId(got.data.id)
          setMessages(
            got.data.messages.length ? got.data.messages : [createWelcomeMessage('agent')]
          )
          setAttachments([])
          setInput('')
          return
        }
      }

      const fresh = emptyConversation(mapId, 'agent')
      setConversationId(fresh.id)
      setMessages(fresh.messages)
      setAttachments([])
      setInput('')
      persistConversation(fresh)
      await window.dmm.agentChats.setActive(mapId, fresh.id)
      if (!cancelled) await refreshList(mapId)
    })()

    return () => {
      cancelled = true
    }
  }, [mapId, persistConversation, refreshList])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, aiBusy, statusHint])

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    }
  }, [])

  if (!file || !mapId) return null

  const saveMessages = (nextMessages: AiUiMessage[], title?: string) => {
    if (!conversationId) return
    const now = new Date().toISOString()
    const prev = conversationsRef.current.find((c) => c.id === conversationId)
    const conv: AiConversation = {
      id: conversationId,
      mapId,
      title: title ?? prev?.title ?? '新对话',
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
      messages: nextMessages
    }
    persistConversation(conv)
  }

  const handleNewChat = async () => {
    if (aiBusy) return
    const fresh = emptyConversation(mapId, mode)
    setConversationId(fresh.id)
    setMessages(fresh.messages)
    setAttachments([])
    setInput('')
    persistConversation(fresh)
    await window.dmm.agentChats.setActive(mapId, fresh.id)
    await refreshList(mapId)
  }

  const handleModeChange = useCallback(
    (next: AiChatMode) => {
      if (aiBusy || next === mode) return
      setMode(next)
      setMessages((prev) => {
        if (prev.length === 1 && prev[0]?.id === 'welcome') {
          return [{ ...prev[0], content: welcomeTextForMode(next) }]
        }
        return prev
      })
    },
    [aiBusy, mode]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (aiBusy) return
      const meta = e.metaKey || e.ctrlKey
      // ⌘. / Ctrl+. 在 Ask ↔ Agent 间切换
      if (meta && e.key === '.' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        handleModeChange(mode === 'ask' ? 'agent' : 'ask')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aiBusy, mode, handleModeChange])

  const handleSelectChat = async (id: string) => {
    if (aiBusy || id === conversationId) return
    const res = await window.dmm.agentChats.get(mapId, id)
    if (!res.ok || !res.data) {
      showToast(res.ok ? '对话不存在' : res.message, 'error')
      return
    }
    setConversationId(res.data.id)
    setMessages(
      res.data.messages.length ? res.data.messages : [createWelcomeMessage(mode)]
    )
    setAttachments([])
    setInput('')
    await window.dmm.agentChats.setActive(mapId, res.data.id)
    await refreshList(mapId)
  }

  const handleDeleteChat = async (id: string) => {
    if (aiBusy) return
    await window.dmm.agentChats.delete(mapId, id)
    const list = await window.dmm.agentChats.list(mapId)
    if (!list.ok) return
    setConversations(list.data.conversations)
    if (id !== conversationId) return

    if (list.data.activeId) {
      await handleSelectChat(list.data.activeId)
    } else {
      await handleNewChat()
    }
  }

  const handlePickFiles = async () => {
    if (!capabilities) return
    const filters = attachmentDialogFilters(capabilities)
    const picked = await window.dmm.dialog.openFile(filters, true)
    if (!picked.ok || !picked.data?.length) return

    const loaded: AiAttachment[] = []
    for (const path of picked.data) {
      const res = await window.dmm.attachments.read(path)
      if (!res.ok) {
        showToast(res.message, 'error')
        continue
      }
      loaded.push(res.data)
    }
    if (loaded.length) {
      setAttachments((prev) => [...prev, ...loaded].slice(0, 6))
    }
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if ((!text && attachments.length === 0) || aiBusy) return

    const pending = attachments
    const userMsg: AiUiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || '（见上传素材）',
      createdAt: new Date().toISOString(),
      attachments: pending.length ? pending.map(toAttachmentRef) : undefined
    }

    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map(({ role, content, attachments: refs }) => ({ role, content, attachments: refs }))

    const assistantId = crypto.randomUUID()
    const liveAssistant: AiUiMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      steps: []
    }
    liveAssistantIdRef.current = assistantId

    setMessages([...messages, userMsg, liveAssistant])
    setInput('')
    setAttachments([])
    setStatusHint('开始处理…')
    setAiBusy(true)

    const isFirstUser = !messages.some((m) => m.role === 'user')
    const title = isFirstUser
      ? conversationTitleFromMessage(text || pending[0]?.name || '素材讨论')
      : undefined
    // 仅持久化用户消息；助手消息等结束后再写
    saveMessages([...messages, userMsg], title)

    try {
      const latest = useEditorStore.getState().file
      if (!latest) return

      const res = await window.dmm.ai.complete({
        type: 'agentChat',
        mode,
        message: text,
        history,
        attachments: pending.length ? pending : undefined,
        mapTitle: latest.map.title,
        mapNodes: latest.map.nodes.map((n) => ({
          id: n.id,
          parentId: n.parentId,
          text: n.text,
          order: n.order
        }))
      })

      if (!res.ok) {
        if (res.code === 'CANCELLED') {
          setMessages((prev) => {
            const cur = prev.find((m) => m.id === assistantId)
            const steps = cur?.steps?.map((s) =>
              s.status === 'running' ? { ...s, status: 'done' as const } : s
            )
            const stopped: AiUiMessage = {
              id: assistantId,
              role: 'assistant',
              content: cur?.content?.trim() || '已停止生成。',
              createdAt: cur?.createdAt ?? new Date().toISOString(),
              steps: steps?.length ? steps : undefined
            }
            const done = prev.map((m) => (m.id === assistantId ? stopped : m))
            saveMessages(done, title)
            return done
          })
          return
        }
        const failedMsg: AiUiMessage = {
          id: assistantId,
          role: 'assistant',
          content: res.message,
          createdAt: new Date().toISOString()
        }
        setMessages((prev) => {
          const base = prev.filter((m) => m.id !== assistantId)
          const done = [...base, failedMsg]
          saveMessages(done, title)
          return done
        })
        showToast(res.message, 'error')
        return
      }

      const data = res.data as AiAgentResponse
      const opsApplied = mode === 'agent' ? applyAgentOps(data.operations ?? []) : []
      setMessages((prev) => {
        const cur = prev.find((m) => m.id === assistantId)
        const steps = cur?.steps?.map((s) =>
          s.status === 'running' ? { ...s, status: 'done' as const } : s
        )
        const assistantMsg: AiUiMessage = {
          id: assistantId,
          role: 'assistant',
          content: data.reply || cur?.content || '好的。',
          createdAt: cur?.createdAt ?? new Date().toISOString(),
          steps: steps?.length ? steps : undefined,
          opsApplied: opsApplied.length ? opsApplied : undefined
        }
        const done = prev.map((m) => (m.id === assistantId ? assistantMsg : m))
        saveMessages(done, title)
        return done
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI 失败'
      const errMsg: AiUiMessage = {
        id: assistantId,
        role: 'assistant',
        content: msg,
        createdAt: new Date().toISOString()
      }
      setMessages((prev) => {
        const base = prev.filter((m) => m.id !== assistantId)
        const failed = [...base, errMsg]
        saveMessages(failed, title)
        return failed
      })
      showToast(msg, 'error')
    } finally {
      liveAssistantIdRef.current = null
      setStatusHint(null)
      setAiBusy(false)
    }
  }

  const conversationTitle =
    conversations.find((c) => c.id === conversationId)?.title ?? '新对话'

  return (
    <aside className="ai-island agent-panel" aria-label="AI 助手">
      <AgentHeader
        busy={aiBusy}
        conversationTitle={conversationTitle}
        conversations={conversations}
        activeId={conversationId}
        onNewChat={() => void handleNewChat()}
        onSelectChat={(id) => void handleSelectChat(id)}
        onDeleteChat={(id) => void handleDeleteChat(id)}
        onClose={() => setRightPanel(null)}
      />

      <AgentMessageList
        messages={messages}
        busy={aiBusy}
        statusHint={statusHint}
        listRef={listRef}
      />

      <AgentComposer
        value={input}
        attachments={attachments}
        capabilities={capabilities}
        mode={mode}
        busy={aiBusy}
        onChange={setInput}
        onModeChange={handleModeChange}
        onSend={() => void send(input)}
        onStop={() => void window.dmm.ai.abort()}
        onPickFiles={() => void handlePickFiles()}
        onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
      />
    </aside>
  )
}
