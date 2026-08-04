import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconChevronDown } from './icons'

export type MenuItem = {
  id: string
  label: string
  hint?: string
  icon?: ReactNode
  disabled?: boolean
  danger?: boolean
  active?: boolean
  onSelect: () => void
}

type Props = {
  label: string
  icon?: ReactNode
  items: MenuItem[]
  /** Visible text when showLabel; defaults to label */
  text?: string
  tone?: 'default' | 'ai'
  showLabel?: boolean
  /** Align dropdown to the end (right) of the trigger */
  align?: 'start' | 'end'
  /** Stretch trigger to full width (sidebar nav) */
  block?: boolean
  className?: string
  triggerClassName?: string
}

export function IconMenu({
  label,
  icon,
  items,
  text,
  tone = 'default',
  showLabel = false,
  align = 'start',
  block = false,
  className = '',
  triggerClassName = ''
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const visible = text ?? label

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={`icon-menu ${align === 'end' ? 'icon-menu--end' : ''} ${block ? 'icon-menu--block' : ''} ${className}`.trim()}
      ref={ref}
    >
      <button
        type="button"
        className={`icon-btn ${tone === 'ai' ? 'icon-btn--ai' : ''} ${showLabel ? 'icon-btn--labeled' : ''} ${open ? 'is-active' : ''} ${triggerClassName}`.trim()}
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon != null && <span className="icon-btn__glyph">{icon}</span>}
        {showLabel && <span className="icon-btn__text">{visible}</span>}
        {showLabel && (
          <span className="icon-btn__glyph icon-btn__chevron">
            <IconChevronDown size={12} />
          </span>
        )}
      </button>
      {open && (
        <div className="icon-menu__panel" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`icon-menu__item ${item.danger ? 'is-danger' : ''} ${item.active ? 'is-active' : ''}`.trim()}
              disabled={item.disabled}
              aria-current={item.active ? 'true' : undefined}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.icon && <span className="icon-menu__item-icon">{item.icon}</span>}
              <span className="icon-menu__item-label">{item.label}</span>
              {item.hint && <span className="icon-menu__item-hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
