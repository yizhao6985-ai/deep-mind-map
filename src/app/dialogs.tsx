import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'

type PromptState = {
  open: boolean
  title: string
  defaultValue: string
  resolve: ((value: string | null) => void) | null
}

type ConfirmState = {
  open: boolean
  message: string
  resolve: ((ok: boolean) => void) | null
}

type DialogStore = {
  prompt: PromptState
  confirm: ConfirmState
  askPrompt: (title: string, defaultValue?: string) => Promise<string | null>
  askConfirm: (message: string) => Promise<boolean>
  closePrompt: (value: string | null) => void
  closeConfirm: (ok: boolean) => void
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  prompt: { open: false, title: '', defaultValue: '', resolve: null },
  confirm: { open: false, message: '', resolve: null },
  askPrompt: (title, defaultValue = '') =>
    new Promise((resolve) => {
      set({ prompt: { open: true, title, defaultValue, resolve } })
    }),
  askConfirm: (message) =>
    new Promise((resolve) => {
      set({ confirm: { open: true, message, resolve } })
    }),
  closePrompt: (value) => {
    const { resolve } = get().prompt
    resolve?.(value)
    set({ prompt: { open: false, title: '', defaultValue: '', resolve: null } })
  },
  closeConfirm: (ok) => {
    const { resolve } = get().confirm
    resolve?.(ok)
    set({ confirm: { open: false, message: '', resolve: null } })
  }
}))

export function askPrompt(title: string, defaultValue = ''): Promise<string | null> {
  return useDialogStore.getState().askPrompt(title, defaultValue)
}

export function askConfirm(message: string): Promise<boolean> {
  return useDialogStore.getState().askConfirm(message)
}

export function DialogHost() {
  const prompt = useDialogStore((s) => s.prompt)
  const confirm = useDialogStore((s) => s.confirm)
  const closePrompt = useDialogStore((s) => s.closePrompt)
  const closeConfirm = useDialogStore((s) => s.closeConfirm)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (prompt.open) {
      setValue(prompt.defaultValue)
      queueMicrotask(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [prompt.open, prompt.defaultValue])

  return (
    <>
      {prompt.open && (
        <div className="modal-backdrop" onClick={() => closePrompt(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closePrompt(null)
              if (e.key === 'Enter') closePrompt(value)
            }}
          >
            <h3>{prompt.title}</h3>
            <div className="field" style={{ marginBottom: 0 }}>
              <input
                ref={inputRef}
                className="input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => closePrompt(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={() => closePrompt(value)}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm.open && (
        <div className="modal-backdrop" onClick={() => closeConfirm(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeConfirm(false)
            }}
          >
            <h3>确认</h3>
            <p className="caption">{confirm.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => closeConfirm(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={() => closeConfirm(true)}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
