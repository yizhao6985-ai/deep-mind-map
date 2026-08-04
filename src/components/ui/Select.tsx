import { useEffect, useId, useRef, useState } from 'react'
import { IconChevronDown } from './icons'

export type SelectOption = {
  value: string
  label: string
  hint?: string
  disabled?: boolean
}

type Props = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Accessible name; falls back to placeholder */
  label?: string
  className?: string
}

export function Select({
  value,
  options,
  onChange,
  placeholder = '请选择',
  disabled = false,
  label,
  className = ''
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)
  const display = selected?.label ?? placeholder
  const ariaLabel = label ?? placeholder

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

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div
      className={`select ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
      ref={ref}
    >
      <button
        type="button"
        className="select__trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`select__value${!selected ? ' is-placeholder' : ''}`}>{display}</span>
        <span className="select__chevron" aria-hidden>
          <IconChevronDown size={14} />
        </span>
      </button>
      {open && (
        <div className="select__panel" role="listbox" id={listId} aria-label={ariaLabel}>
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value || opt.label}
                type="button"
                role="option"
                aria-selected={active}
                className={`select__option${active ? ' is-active' : ''}`.trim()}
                disabled={opt.disabled}
                onClick={() => {
                  setOpen(false)
                  if (opt.value !== value) onChange(opt.value)
                }}
              >
                <span className="select__option-label">{opt.label}</span>
                {opt.hint && <span className="select__option-hint">{opt.hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
