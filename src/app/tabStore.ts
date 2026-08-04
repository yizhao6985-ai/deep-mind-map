import { create } from 'zustand'

export type EditorTab = {
  id: string
  title: string
}

type TabState = {
  tabs: EditorTab[]
  openTab: (id: string, title: string) => void
  closeTab: (id: string) => string | null
  updateTabTitle: (id: string, title: string) => void
  clearTabs: () => void
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],

  openTab: (id, title) => {
    const { tabs } = get()
    if (tabs.some((t) => t.id === id)) {
      set({
        tabs: tabs.map((t) => (t.id === id ? { ...t, title } : t))
      })
      return
    }
    set({ tabs: [...tabs, { id, title }] })
  },

  closeTab: (id) => {
    const { tabs } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx < 0) return null
    const next = tabs.filter((t) => t.id !== id)
    set({ tabs: next })
    if (next.length === 0) return null
    const fallback = next[Math.min(idx, next.length - 1)]
    return fallback.id
  },

  updateTabTitle: (id, title) => {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, title } : t))
    })
  },

  clearTabs: () => set({ tabs: [] })
}))
