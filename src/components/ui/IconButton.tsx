import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: ReactNode
  /** show text beside icon */
  showLabel?: boolean
  tone?: 'default' | 'ai' | 'danger' | 'primary'
  active?: boolean
}

export function IconButton({
  label,
  icon,
  showLabel = false,
  tone = 'default',
  active = false,
  className = '',
  ...rest
}: Props) {
  const toneClass =
    tone === 'ai'
      ? 'icon-btn--ai'
      : tone === 'danger'
        ? 'icon-btn--danger'
        : tone === 'primary'
          ? 'icon-btn--primary'
          : ''

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`icon-btn ${toneClass} ${active ? 'is-active' : ''} ${showLabel ? 'icon-btn--labeled' : ''} ${className}`.trim()}
      {...rest}
    >
      <span className="icon-btn__glyph">{icon}</span>
      {showLabel && <span className="icon-btn__text">{label}</span>}
    </button>
  )
}
