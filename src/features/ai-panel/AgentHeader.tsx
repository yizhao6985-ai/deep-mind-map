import { IconButton } from '@/components/ui/IconButton'
import { IconMenu, type MenuItem } from '@/components/ui/IconMenu'
import { IconClose, IconPlus, IconTrash } from '@/components/ui/icons'

type ConversationMeta = {
  id: string
  title: string
  updatedAt: string
}

type Props = {
  busy: boolean
  conversationTitle: string
  conversations: ConversationMeta[]
  activeId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
  onClose: () => void
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function AgentHeader({
  busy,
  conversationTitle,
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose
}: Props) {
  const title = conversationTitle || '新对话'

  const historyItems: MenuItem[] =
    conversations.length === 0
      ? [
          {
            id: 'empty',
            label: '暂无历史对话',
            disabled: true,
            onSelect: () => undefined
          }
        ]
      : conversations.map((c) => ({
          id: c.id,
          label: c.title,
          hint: formatTime(c.updatedAt),
          active: c.id === activeId,
          onSelect: () => onSelectChat(c.id)
        }))

  return (
    <header className={`agent-panel__header ${busy ? 'is-busy' : ''}`}>
      <div className="agent-panel__leading">
        <span className="agent-panel__brand" aria-hidden>
          AI
        </span>
        <IconMenu
          label="切换对话"
          text={busy ? '正在思考…' : title}
          showLabel
          items={historyItems}
          className="agent-panel__switcher"
          triggerClassName="agent-panel__switcher-btn"
        />
      </div>

      <div className="agent-panel__actions" role="toolbar" aria-label="助手操作">
        <IconButton label="新对话" icon={<IconPlus size={15} />} onClick={onNewChat} disabled={busy} />
        <IconButton
          label="删除当前对话"
          icon={<IconTrash size={15} />}
          tone="danger"
          disabled={!activeId || busy}
          onClick={() => {
            if (activeId) onDeleteChat(activeId)
          }}
        />
        <span className="agent-panel__action-rule" aria-hidden />
        <IconButton label="关闭" icon={<IconClose size={15} />} onClick={onClose} />
      </div>
    </header>
  )
}
