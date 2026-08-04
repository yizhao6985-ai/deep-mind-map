import { useEffect, useState, type RefObject } from 'react'
import type { AiAgentStep, AiUiMessage } from '@shared/types/domain'
import { IconChevronDown, IconChevronRight } from '@/components/ui/icons'
import { AgentMarkdown } from './AgentMarkdown'

type Props = {
  messages: AiUiMessage[]
  busy: boolean
  statusHint?: string | null
  listRef: RefObject<HTMLDivElement | null>
}

function StepList({ steps, live }: { steps: AiAgentStep[]; live: boolean }) {
  const running = steps.some((s) => s.status === 'running')
  const allDone = steps.length > 0 && steps.every((s) => s.status !== 'running')
  const [open, setOpen] = useState(live || running)

  useEffect(() => {
    if (live || running) setOpen(true)
    else if (allDone) setOpen(false)
  }, [live, running, allDone])

  if (!steps.length) return null

  const doneCount = steps.filter((s) => s.status === 'done').length
  const errorCount = steps.filter((s) => s.status === 'error').length
  const summary = running
    ? `执行中 · ${doneCount}/${steps.length}`
    : errorCount > 0
      ? `完成 ${doneCount} 步 · ${errorCount} 失败`
      : `已完成 ${steps.length} 步`

  return (
    <div className={`agent-steps-wrap${open ? ' is-open' : ''}${running ? ' is-running' : ''}`}>
      <button
        type="button"
        className="agent-steps__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="agent-steps__chevron" aria-hidden>
          {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        </span>
        <span className="agent-steps__summary">{summary}</span>
        {running ? <span className="agent-steps__pulse" aria-hidden /> : null}
      </button>
      {open ? (
        <ul className="agent-steps" aria-label="执行过程">
          {steps.map((s) => (
            <li key={s.id} className={`agent-step agent-step--${s.status}`} data-tool={s.toolName}>
              <span className="agent-step__marker" aria-hidden />
              <span className="agent-step__body">
                <span className="agent-step__label">{s.label}</span>
                {s.detail ? <span className="agent-step__detail">{s.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function MessageMeta({
  attachments,
  opsApplied,
  tone
}: {
  attachments?: AiUiMessage['attachments']
  opsApplied?: string[]
  tone: 'user' | 'assistant'
}) {
  const hasAtt = Boolean(attachments?.length)
  const hasOps = Boolean(opsApplied?.length)
  if (!hasAtt && !hasOps) return null

  return (
    <div className={`agent-msg__meta agent-msg__meta--${tone}`}>
      {attachments?.map((a) => (
        <span key={a.id} className="agent-chip">
          {a.kind === 'image' ? '图片' : '文本'} · {a.name}
        </span>
      ))}
      {opsApplied?.map((op, i) => (
        <span key={`${op}-${i}`} className="agent-chip agent-chip--op">
          {op}
        </span>
      ))}
    </div>
  )
}

export function AgentMessageList({ messages, busy, statusHint, listRef }: Props) {
  const last = messages[messages.length - 1]

  return (
    <div className="agent-panel__messages" ref={listRef}>
      {messages.map((m) => {
        if (m.id === 'welcome') {
          return (
            <div key={m.id} className="agent-welcome">
              <span className="agent-welcome__brand" aria-hidden>
                AI
              </span>
              <p className="agent-welcome__text">{m.content}</p>
            </div>
          )
        }

        const isLive = busy && m.id === last?.id && m.role === 'assistant'
        const hasSteps = Boolean(m.steps?.length)
        const showThinking = isLive && !m.content && !hasSteps
        const showHint = isLive && statusHint && !m.content

        if (m.role === 'user') {
          return (
            <div key={m.id} className="agent-msg agent-msg--user">
              <p className="agent-msg__plain">{m.content}</p>
              <MessageMeta attachments={m.attachments} tone="user" />
            </div>
          )
        }

        return (
          <div
            key={m.id}
            className={`agent-msg agent-msg--assistant${isLive ? ' agent-msg--live' : ''}`}
          >
            {hasSteps && m.steps ? <StepList steps={m.steps} live={isLive} /> : null}

            {showThinking ? (
              <div className="agent-msg__thinking" aria-label="正在思考">
                <span className="agent-thinking">
                  <span />
                  <span />
                  <span />
                </span>
                {showHint ? <span className="agent-msg__hint">{statusHint}</span> : null}
              </div>
            ) : null}

            {m.content ? <AgentMarkdown text={m.content} live={isLive} /> : null}

            {isLive && statusHint && m.content && !hasSteps ? (
              <p className="agent-msg__hint">{statusHint}</p>
            ) : null}

            <MessageMeta attachments={m.attachments} opsApplied={m.opsApplied} tone="assistant" />
          </div>
        )
      })}
    </div>
  )
}
