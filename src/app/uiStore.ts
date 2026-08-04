import { create } from 'zustand'

type Toast = { id: number; message: string; kind: 'ok' | 'error' }

export type RightPanel = 'ai' | 'settings' | null

export const SIDEBAR_WIDTH_DEFAULT = 220
export const SIDEBAR_WIDTH_MIN = 160
export const SIDEBAR_WIDTH_MAX = 480

const SIDEBAR_WIDTH_KEY = 'dmm.sidebarWidth'

function loadSidebarWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (raw == null) return SIDEBAR_WIDTH_DEFAULT
    const n = Number(raw)
    if (!Number.isFinite(n)) return SIDEBAR_WIDTH_DEFAULT
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(n)))
  } catch {
    return SIDEBAR_WIDTH_DEFAULT
  }
}

type UiState = {
  toast: Toast | null
  rightPanel: RightPanel
  sidebarCollapsed: boolean
  sidebarWidth: number
  syncProgress: string | null
  /** 图库变更计数：拉取 / 导入等写盘后递增，侧栏据此刷新 */
  libraryEpoch: number
  showToast: (message: string, kind?: 'ok' | 'error') => void
  clearToast: () => void
  setRightPanel: (panel: RightPanel) => void
  toggleRightPanel: (panel: Exclude<RightPanel, null>) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setSyncProgress: (v: string | null) => void
  bumpLibrary: () => void
}

let toastId = 0

export const useUiStore = create<UiState>((set, get) => ({
  toast: null,
  rightPanel: null,
  sidebarCollapsed: false,
  sidebarWidth: loadSidebarWidth(),
  syncProgress: null,
  libraryEpoch: 0,
  showToast: (message, kind = 'ok') => {
    const id = ++toastId
    set({ toast: { id, message, kind } })
    setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s))
    }, 3500)
  },
  clearToast: () => set({ toast: null }),
  setRightPanel: (panel) => set({ rightPanel: panel }),
  toggleRightPanel: (panel) => {
    set({ rightPanel: get().rightPanel === panel ? null : panel })
  },
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setSidebarWidth: (width) => {
    const next = Math.min(
      SIDEBAR_WIDTH_MAX,
      Math.max(SIDEBAR_WIDTH_MIN, Math.round(width))
    )
    set({ sidebarWidth: next })
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next))
    } catch {
      /* ignore quota / private mode */
    }
  },
  setSyncProgress: (v) => set({ syncProgress: v }),
  bumpLibrary: () => set((s) => ({ libraryEpoch: s.libraryEpoch + 1 }))
}))
