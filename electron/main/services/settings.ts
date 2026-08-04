import fs from 'fs'
import type { AppSettings } from '@shared/types/domain'
import { getLibraryRoot, settingsPath } from '../paths'

export const defaultSettings = (): AppSettings => ({
  schemaVersion: 1,
  libraryPath: null,
  locale: 'zh-CN',
  onboardingCompleted: false,
  themeMode: 'system',
  ai: {
    providerType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7
  },
  github: {
    owner: '',
    repo: '',
    branch: 'main',
    displayName: ''
  },
  recentMapIds: []
})

let cachedRoot: string | null = null

export function resolveRoot(settings?: AppSettings | null): string {
  const s = settings ?? readSettings()
  cachedRoot = getLibraryRoot(s.libraryPath)
  return cachedRoot
}

export function readSettings(): AppSettings {
  const root = getLibraryRoot(null)
  // bootstrap: may need custom path from file itself — first read default location
  const p = settingsPath(root)
  if (!fs.existsSync(p)) {
    const s = defaultSettings()
    writeSettings(s, root)
    return s
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as AppSettings
    const merged = { ...defaultSettings(), ...raw, ai: { ...defaultSettings().ai, ...raw.ai }, github: { ...defaultSettings().github, ...raw.github } }
    if (merged.libraryPath) {
      const customRoot = getLibraryRoot(merged.libraryPath)
      const customP = settingsPath(customRoot)
      if (customP !== p && fs.existsSync(customP)) {
        const raw2 = JSON.parse(fs.readFileSync(customP, 'utf8')) as AppSettings
        return { ...defaultSettings(), ...raw2, ai: { ...defaultSettings().ai, ...raw2.ai }, github: { ...defaultSettings().github, ...raw2.github } }
      }
    }
    return merged
  } catch {
    return defaultSettings()
  }
}

export function writeSettings(settings: AppSettings, root?: string): AppSettings {
  const r = root ?? resolveRoot(settings)
  fs.writeFileSync(settingsPath(r), JSON.stringify(settings, null, 2), 'utf8')
  return settings
}

export function patchSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings()
  const github = { ...current.github, ...(patch.github ?? {}) }
  // 兼容旧配置中的 pathPrefix，写入时丢弃
  delete (github as { pathPrefix?: string }).pathPrefix
  const next: AppSettings = {
    ...current,
    ...patch,
    ai: { ...current.ai, ...(patch.ai ?? {}) },
    github,
    recentMapIds: patch.recentMapIds ?? current.recentMapIds
  }
  return writeSettings(next)
}
