import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyThemeMode, watchSystemTheme } from './app/theme'
import './styles/tokens.css'

if (typeof window !== 'undefined' && window.dmm?.app?.platform) {
  document.documentElement.dataset.platform = window.dmm.app.platform
}

function Root() {
  const [ready, setReady] = useState(false)
  const [toOnboarding, setToOnboarding] = useState(false)

  useEffect(() => {
    void (async () => {
      if (!window.dmm) {
        applyThemeMode('system')
        setReady(true)
        return
      }
      document.documentElement.dataset.platform = window.dmm.app.platform
      const res = await window.dmm.settings.get()
      if (res.ok) {
        applyThemeMode(res.data.themeMode ?? 'system')
        if (!res.data.onboardingCompleted) setToOnboarding(true)
      } else {
        applyThemeMode('system')
      }
      setReady(true)
    })()
  }, [])

  useEffect(() => watchSystemTheme(), [])

  if (!ready) return null
  if (toOnboarding && !window.location.hash.includes('onboarding')) {
    window.location.hash = '#/onboarding'
  }
  return (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
