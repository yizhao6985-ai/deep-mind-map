import type { AiAttachment } from '@shared/types/domain'
import { IconClose, IconFile, IconImage } from '@/components/ui/icons'

type Props = {
  attachments: AiAttachment[]
  onRemove: (id: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExt(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0 || i === name.length - 1) return ''
  return name.slice(i + 1).toUpperCase()
}

export function AgentAttachmentList({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null

  return (
    <div className="agent-attachments" aria-label="待发送素材">
      {attachments.map((a) => {
        const ext = fileExt(a.name)
        return (
          <div key={a.id} className="agent-attachment" title={a.name}>
            <span className="agent-attachment__thumb" aria-hidden>
              {a.kind === 'image' && a.base64 ? (
                <img
                  className="agent-attachment__preview"
                  src={`data:${a.mimeType};base64,${a.base64}`}
                  alt=""
                />
              ) : a.kind === 'image' ? (
                <IconImage size={14} />
              ) : ext ? (
                <span className="agent-attachment__ext">{ext.slice(0, 4)}</span>
              ) : (
                <IconFile size={14} />
              )}
            </span>
            <span className="agent-attachment__meta">
              <span className="agent-attachment__name">{a.name}</span>
              <span className="agent-attachment__size">{formatSize(a.size)}</span>
            </span>
            <button
              type="button"
              className="agent-attachment__remove"
              aria-label="移除素材"
              onClick={() => onRemove(a.id)}
            >
              <IconClose size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
