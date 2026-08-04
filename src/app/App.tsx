import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WorkspacePage } from '@/features/workspace/WorkspacePage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { useUiStore } from '@/app/uiStore'
import { DialogHost } from '@/app/dialogs'

function ToastHost() {
  const toast = useUiStore((s) => s.toast)
  if (!toast) return null
  return <div className={`toast ${toast.kind === 'error' ? 'error' : ''}`}>{toast.message}</div>
}

export function App() {
  return (
    <HashRouter>
      <ToastHost />
      <DialogHost />
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/maps/:id" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
