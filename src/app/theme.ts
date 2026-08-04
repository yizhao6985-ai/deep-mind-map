import type { ThemeMode } from '@shared/types/domain'

export type ResolvedTheme = 'light' | 'dark'

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function applyThemeMode(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode)
  document.documentElement.dataset.themeMode = mode
  document.documentElement.dataset.theme = resolved
  return resolved
}

function currentThemeMode(): ThemeMode {
  const raw = document.documentElement.dataset.themeMode
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

/** Listen for OS theme changes when mode is `system`. Returns cleanup. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (currentThemeMode() === 'system') applyThemeMode('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
