import { useEffect, useState } from 'react'
import type {
  AppSettings,
  GitHubDeviceCode,
  SyncConflict,
  ThemeMode
} from '@shared/types/domain'
import { applyThemeMode } from '@/app/theme'
import { useUiStore } from '@/app/uiStore'
import { IconButton } from '@/components/ui/IconButton'
import { IconClose, IconSettings } from '@/components/ui/icons'
import { Select } from '@/components/ui/Select'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
]

type SettingsCategory = 'general' | 'ai' | 'sync' | 'about'

const CATEGORIES: { id: SettingsCategory; label: string; description: string }[] = [
  { id: 'general', label: '通用', description: '外观与本机图库' },
  { id: 'ai', label: 'AI', description: '模型与接口' },
  { id: 'sync', label: '同步', description: 'GitHub 备份' },
  { id: 'about', label: '关于', description: '产品信息' }
]

export function SettingsPanel() {
  const [category, setCategory] = useState<SettingsCategory>('general')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [aiKey, setAiKey] = useState('')
  const [hasAiKey, setHasAiKey] = useState(false)
  const [ghLogin, setGhLogin] = useState<string | null>(null)
  const [ghConnected, setGhConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [deviceCode, setDeviceCode] = useState<GitHubDeviceCode | null>(null)
  const [paths, setPaths] = useState<string>('')
  const [conflicts, setConflicts] = useState<SyncConflict[] | null>(null)
  const showToast = useUiStore((s) => s.showToast)
  const setSyncProgress = useUiStore((s) => s.setSyncProgress)
  const syncProgress = useUiStore((s) => s.syncProgress)
  const bumpLibrary = useUiStore((s) => s.bumpLibrary)
  const setRightPanel = useUiStore((s) => s.setRightPanel)

  useEffect(() => {
    const offProgress = window.dmm.github.onProgress((p) => {
      setSyncProgress(`正在同步 ${p.current}/${p.total}：${p.path}`)
    })
    const offAuth = window.dmm.github.onAuthCode((info) => {
      setDeviceCode(info)
    })
    return () => {
      offProgress()
      offAuth()
    }
  }, [setSyncProgress])

  const push = async () => {
    setSyncProgress('准备推送…')
    const res = await window.dmm.github.push()
    setSyncProgress(null)
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    showToast(`已推送 ${res.data.written} 个文件`)
  }

  const pull = async (resolutions?: Record<string, 'keep-local' | 'use-remote' | 'skip'>) => {
    setSyncProgress('准备拉取…')
    const res = await window.dmm.github.pull(resolutions)
    setSyncProgress(null)
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    if (res.data.conflicts.length) {
      setConflicts(res.data.conflicts)
      showToast(`发现 ${res.data.conflicts.length} 个冲突`, 'error')
      return
    }
    bumpLibrary()
    showToast(`已拉取 ${res.data.written} 个文件`)
  }

  const reload = async () => {
    const s = await window.dmm.settings.get()
    if (s.ok) setSettings(s.data)
    const a = await window.dmm.secrets.has('ai.apiKey')
    if (a.ok) setHasAiKey(a.data)
    const auth = await window.dmm.github.authStatus()
    if (auth.ok) {
      setGhConnected(auth.data.connected)
      setGhLogin(auth.data.login)
    }
    const p = await window.dmm.app.getPaths()
    if (p.ok) setPaths(p.data.libraryRoot)
  }

  useEffect(() => {
    void reload()
  }, [])

  const connectGitHub = async () => {
    setConnecting(true)
    setDeviceCode(null)
    const res = await window.dmm.github.connect()
    setConnecting(false)
    setDeviceCode(null)
    if (!res.ok) {
      if (res.code !== 'CANCELLED') showToast(res.message, 'error')
      return
    }
    showToast(`已连接 @${res.data.login}，同步仓库 ${res.data.repo}`)
    await reload()
  }

  const syncRepoFullName =
    settings?.github.owner && settings.github.repo
      ? `${settings.github.owner}/${settings.github.repo}`
      : ''

  const activeCategory = CATEGORIES.find((c) => c.id === category)!

  return (
    <div className="workspace-settings">
      <div className="workspace-settings__bar">
        <div className="workspace-settings__title">
          <IconSettings size={16} />
          <span>设置</span>
        </div>
        <IconButton label="关闭" icon={<IconClose size={16} />} onClick={() => setRightPanel(null)} />
      </div>

      <div className="workspace-settings__body">
        <nav className="workspace-settings__nav" aria-label="设置分类">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`workspace-settings__nav-item${category === item.id ? ' is-active' : ''}`}
              aria-current={category === item.id ? 'page' : undefined}
              onClick={() => setCategory(item.id)}
            >
              <span className="workspace-settings__nav-label">{item.label}</span>
              <span className="workspace-settings__nav-desc">{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="workspace-settings__content">
          {!settings ? (
            <p className="caption">加载中…</p>
          ) : (
            <div className="workspace-settings__pane">
              <header className="workspace-settings__pane-head">
                <h1>{activeCategory.label}</h1>
                <p className="caption">{activeCategory.description}</p>
              </header>

              {category === 'general' && (
                <>
                  <section className="settings-block" id="appearance">
                    <h2>外观</h2>
                    <p className="caption">选择应用主题模式，立即生效。</p>
                    <div className="field">
                      <label>主题</label>
                      <div className="theme-mode" role="radiogroup" aria-label="主题模式">
                        {THEME_OPTIONS.map((opt) => {
                          const active = (settings.themeMode ?? 'system') === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`theme-mode__btn${active ? ' is-active' : ''}`}
                              onClick={async () => {
                                const themeMode = opt.value
                                setSettings({ ...settings, themeMode })
                                applyThemeMode(themeMode)
                                const res = await window.dmm.settings.set({ themeMode })
                                if (!res.ok) {
                                  showToast(res.message, 'error')
                                  return
                                }
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </section>

                  <section className="settings-block" id="library">
                    <h2>图库与存储</h2>
                    <p className="caption">当前图库路径</p>
                    <code className="settings-path">{paths}</code>
                  </section>
                </>
              )}

              {category === 'ai' && (
                <section className="settings-block" id="ai">
                  <h2>模型与连接</h2>
                  <p className="caption">直连你配置的端点；Key 仅存本机。</p>
                  <div className="field">
                    <label>Provider</label>
                    <Select
                      label="Provider"
                      value={settings.ai.providerType}
                      options={[
                        { value: 'openai-compatible', label: 'OpenAI 兼容' },
                        { value: 'anthropic', label: 'Anthropic 兼容' },
                        { value: 'ollama', label: '本地 Ollama' }
                      ]}
                      onChange={(next) => {
                        const providerType = next as 'openai-compatible' | 'anthropic' | 'ollama'
                        const presets = {
                          'openai-compatible': {
                            baseUrl: 'https://api.openai.com/v1',
                            model: 'gpt-4o-mini'
                          },
                          anthropic: {
                            baseUrl: 'https://api.anthropic.com/v1',
                            model: 'claude-3-5-haiku-latest'
                          },
                          ollama: {
                            baseUrl: 'http://127.0.0.1:11434',
                            model: 'llama3.2'
                          }
                        } as const
                        setSettings({
                          ...settings,
                          ai: {
                            ...settings.ai,
                            providerType,
                            baseUrl: presets[providerType].baseUrl,
                            model: presets[providerType].model
                          }
                        })
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>
                      {settings.ai.providerType === 'ollama'
                        ? 'Ollama Host'
                        : settings.ai.providerType === 'anthropic'
                          ? 'Base URL（可改代理）'
                          : 'Base URL'}
                    </label>
                    <input
                      className="input"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      value={settings.ai.baseUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai: { ...settings.ai, baseUrl: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>模型</label>
                    <input
                      className="input"
                      value={settings.ai.model}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai: { ...settings.ai, model: e.target.value }
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>温度</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={settings.ai.temperature}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          ai: { ...settings.ai, temperature: Number(e.target.value) }
                        })
                      }
                    />
                  </div>
                  {settings.ai.providerType !== 'ollama' && (
                    <div className="field">
                      <label>API Key {hasAiKey ? '（已保存）' : ''}</label>
                      <input
                        className="input"
                        type="password"
                        placeholder={hasAiKey ? '••••••••（输入新值以更新）' : 'sk-...'}
                        value={aiKey}
                        onChange={(e) => setAiKey(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="settings-actions">
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        const res = await window.dmm.settings.set({
                          ai: settings.ai,
                          onboardingCompleted: true
                        })
                        if (!res.ok) return showToast(res.message, 'error')
                        if (aiKey.trim()) {
                          const s = await window.dmm.secrets.set('ai.apiKey', aiKey.trim())
                          if (!s.ok) return showToast(s.message, 'error')
                          setAiKey('')
                        }
                        showToast('AI 设置已保存')
                        await reload()
                      }}
                    >
                      保存
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        await window.dmm.settings.set({ ai: settings.ai })
                        if (aiKey.trim()) await window.dmm.secrets.set('ai.apiKey', aiKey.trim())
                        const res = await window.dmm.ai.test()
                        if (!res.ok) return showToast(res.message, 'error')
                        showToast(`连接成功：${res.data.model}`)
                      }}
                    >
                      测试
                    </button>
                  </div>
                </section>
              )}

              {category === 'sync' && (
                <section className="settings-block" id="github">
                  <h2>GitHub 同步</h2>
                  <p className="caption">
                    连接后会自动创建或绑定私有仓库 deep-mind-map，导图同步到仓库根目录。
                  </p>

                  {!ghConnected ? (
                    <div className="settings-actions">
                      <button
                        className="btn btn-primary"
                        disabled={connecting}
                        onClick={() => void connectGitHub()}
                      >
                        {connecting ? '等待授权…' : '连接 GitHub'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="github-auth-row">
                        <span className="github-auth-badge">
                          已连接{ghLogin ? ` @${ghLogin}` : ''}
                        </span>
                        <button
                          className="btn btn-ghost"
                          onClick={async () => {
                            const res = await window.dmm.github.disconnect()
                            if (!res.ok) return showToast(res.message, 'error')
                            showToast('已断开 GitHub')
                            await reload()
                          }}
                        >
                          断开
                        </button>
                      </div>

                      {syncRepoFullName && (
                        <p className="caption">同步仓库 {syncRepoFullName}</p>
                      )}

                      <div className="settings-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={async () => {
                            const res = await window.dmm.github.test()
                            if (!res.ok) return showToast(res.message, 'error')
                            showToast(`连接成功：${res.data.fullName}`)
                          }}
                        >
                          测试
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => void push()}
                          disabled={!!syncProgress}
                        >
                          推送
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => void pull()}
                          disabled={!!syncProgress}
                        >
                          拉取
                        </button>
                      </div>
                    </>
                  )}

                  {syncProgress && (
                    <p className="caption" style={{ marginTop: 8 }}>
                      {syncProgress}
                    </p>
                  )}
                </section>
              )}

              {category === 'about' && (
                <section className="settings-block" id="about">
                  <h2>产品信息</h2>
                  <p className="caption">Deep Mind Map — 开源本地思维导图（MIT）</p>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {deviceCode && connecting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>在浏览器中授权 GitHub</h3>
            <p className="caption">
              已打开 GitHub 验证页。若未自动打开，请前往{' '}
              <code>{deviceCode.verificationUri}</code> 并输入以下代码：
            </p>
            <p className="github-device-code">{deviceCode.userCode}</p>
            <p className="caption">授权完成后此窗口会自动关闭。</p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(deviceCode.userCode)
                    showToast('已复制授权码')
                  } catch {
                    showToast('复制失败，请手动选择代码', 'error')
                  }
                }}
              >
                复制授权码
              </button>
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await window.dmm.github.cancelConnect()
                  setConnecting(false)
                  setDeviceCode(null)
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {conflicts && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>同步冲突</h3>
            <p className="caption">选择如何处理下列文件（本次将全部应用同一策略）</p>
            <ul className="caption">
              {conflicts.map((c) => (
                <li key={c.relativePath}>
                  {c.relativePath}
                  <br />
                  本地 {c.localUpdatedAt ?? '-'} / 远端 {c.remoteUpdatedAt ?? '-'}
                </li>
              ))}
            </ul>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const r = Object.fromEntries(conflicts.map((c) => [c.relativePath, 'skip' as const]))
                  setConflicts(null)
                  void pull(r)
                }}
              >
                全部跳过
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const r = Object.fromEntries(
                    conflicts.map((c) => [c.relativePath, 'use-remote' as const])
                  )
                  setConflicts(null)
                  void pull(r)
                }}
              >
                使用远端
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const r = Object.fromEntries(
                    conflicts.map((c) => [c.relativePath, 'keep-local' as const])
                  )
                  setConflicts(null)
                  void pull(r)
                }}
              >
                保留本地
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
