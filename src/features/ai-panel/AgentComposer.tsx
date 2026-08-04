import type { FormEvent, KeyboardEvent } from 'react'
import type { AiAttachment, AiChatMode, AiModelCapabilities } from '@shared/types/domain'
import { IconButton } from '@/components/ui/IconButton'
import { IconPaperclip, IconSend, IconStop } from '@/components/ui/icons'
import { AgentAttachmentList } from './AgentAttachmentList'

const MODE_SHORTCUT =
  typeof document !== 'undefined' && document.documentElement.dataset.platform === 'darwin'
    ? '⌘.'
    : 'Ctrl+.'

type Props = {
  value: string
  attachments: AiAttachment[]
  capabilities: AiModelCapabilities | null
  mode: AiChatMode
  busy: boolean
  onChange: (value: string) => void
  onModeChange: (mode: AiChatMode) => void
  onSend: () => void
  onStop: () => void
  onPickFiles: () => void
  onRemoveAttachment: (id: string) => void
}

export function AgentComposer({
  value,
  attachments,
  capabilities,
  mode,
  busy,
  onChange,
  onModeChange,
  onSend,
  onStop,
  onPickFiles,
  onRemoveAttachment
}: Props) {
  const canUpload = Boolean(capabilities?.textFiles || capabilities?.images)
  const canSend = !busy && (value.trim().length > 0 || attachments.length > 0)
  const uploadHint = capabilities?.images
    ? '上传文本或图片素材'
    : '上传文本素材（当前模型不支持图片）'
  const placeholder =
    mode === 'ask' ? '提问或讨论思维导图内容…' : '描述想改的节点、结构或补充素材…'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    onSend()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!busy) onSend()
    }
  }

  return (
    <div className="agent-panel__composer-wrap">
      <form className="agent-panel__composer" onSubmit={submit}>
        {attachments.length > 0 && (
          <AgentAttachmentList attachments={attachments} onRemove={onRemoveAttachment} />
        )}
        <textarea
          className="agent-input"
          value={value}
          rows={2}
          placeholder={placeholder}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="agent-composer__toolbar">
          <div className="agent-composer__tools">
            <div className="agent-mode" role="group" aria-label={`AI 模式（${MODE_SHORTCUT} 切换）`}>
              <button
                type="button"
                className={`agent-mode__btn ${mode === 'ask' ? 'is-active' : ''}`}
                aria-pressed={mode === 'ask'}
                disabled={busy}
                onClick={() => onModeChange('ask')}
                title={`Ask：只回答，不修改思维导图（${MODE_SHORTCUT} 切换）`}
              >
                Ask
              </button>
              <button
                type="button"
                className={`agent-mode__btn ${mode === 'agent' ? 'is-active' : ''}`}
                aria-pressed={mode === 'agent'}
                disabled={busy}
                onClick={() => onModeChange('agent')}
                title={`Agent：可读写并更新思维导图（${MODE_SHORTCUT} 切换）`}
              >
                Agent
              </button>
            </div>
            <IconButton
              label={uploadHint}
              icon={<IconPaperclip size={15} />}
              disabled={busy || !canUpload}
              type="button"
              onClick={onPickFiles}
            />
            <span className="agent-composer__hint">
              Enter 发送 · {MODE_SHORTCUT} 切换模式
            </span>
          </div>
          {busy ? (
            <IconButton
              label="停止"
              className="agent-composer__send agent-composer__send--stop"
              icon={<IconStop size={12} />}
              type="button"
              onClick={onStop}
            />
          ) : (
            <IconButton
              label="发送"
              className="agent-composer__send"
              icon={<IconSend size={14} />}
              disabled={!canSend}
              type="submit"
            />
          )}
        </div>
      </form>
    </div>
  )
}
