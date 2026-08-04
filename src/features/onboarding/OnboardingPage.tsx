import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { AiProviderType } from '@shared/types/domain'
import { useUiStore } from '@/app/uiStore'
import { Select } from '@/components/ui/Select'

const PRESETS: Record<AiProviderType, { baseUrl: string; model: string }> = {
  'openai-compatible': { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-haiku-latest' },
  ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2' }
}

export function OnboardingPage() {
  const [done, setDone] = useState<boolean | null>(null)
  const [providerType, setProviderType] = useState<AiProviderType>('openai-compatible')
  const [baseUrl, setBaseUrl] = useState(PRESETS['openai-compatible'].baseUrl)
  const [model, setModel] = useState(PRESETS['openai-compatible'].model)
  const [apiKey, setApiKey] = useState('')
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)

  useEffect(() => {
    void (async () => {
      const res = await window.dmm.settings.get()
      if (res.ok) setDone(res.data.onboardingCompleted)
    })()
  }, [])

  if (done === null) return <div className="empty-hero">加载中…</div>
  if (done) return <Navigate to="/" replace />

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <h1>欢迎使用 Deep Mind Map</h1>
        <p className="caption">配置你自己的 AI 端点即可开始，也可稍后在设置中完成。</p>
        <div className="field">
          <label>Provider</label>
          <Select
            label="Provider"
            value={providerType}
            options={[
              { value: 'openai-compatible', label: 'OpenAI 兼容' },
              { value: 'anthropic', label: 'Anthropic 兼容' },
              { value: 'ollama', label: '本地 Ollama' }
            ]}
            onChange={(next) => {
              const typed = next as AiProviderType
              setProviderType(typed)
              setBaseUrl(PRESETS[typed].baseUrl)
              setModel(PRESETS[typed].model)
            }}
          />
        </div>
        <div className="field">
          <label>{providerType === 'ollama' ? 'Ollama Host' : 'Base URL'}</label>
          <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="field">
          <label>模型</label>
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        {providerType !== 'ollama' && (
          <div className="field">
            <label>API Key</label>
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await window.dmm.settings.set({
                onboardingCompleted: true,
                ai: {
                  providerType,
                  baseUrl,
                  model,
                  temperature: 0.7
                }
              })
              if (apiKey.trim()) await window.dmm.secrets.set('ai.apiKey', apiKey.trim())
              const test = await window.dmm.ai.test()
              if (!test.ok) showToast(test.message, 'error')
              else showToast('连接成功')
              navigate('/')
            }}
          >
            保存并继续
          </button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await window.dmm.settings.set({ onboardingCompleted: true })
              navigate('/')
            }}
          >
            跳过
          </button>
        </div>
      </div>
    </div>
  )
}
