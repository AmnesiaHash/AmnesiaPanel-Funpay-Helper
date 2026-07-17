import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit, useLicenseInit } from './hooks'
import { useAppStore, applyTheme } from './store/app.store'
import { AppShell } from './components/layout/AppShell'
import { ConnectPage } from './pages/ConnectPage'
import { HomePage } from './pages/HomePage'
import { LotsPage } from './pages/LotsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

/** Auth guard — redirects to connect if not authenticated. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const connected = useAppStore((s) => s.connected)
  if (!connected) return <Navigate to="/connect" replace />
  return <>{children}</>
}

/** Root application component. */
export default function App() {
  const { ready: licenseReady } = useLicenseInit()
  const { ready: authReady } = useAuthInit()
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (!window.amnesia) return
    window.amnesia.getSettings().then((r) => {
      if (r.success && r.data) applyTheme(r.data.theme)
    })
  }, [theme])

  if (!licenseReady || !authReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[var(--text-secondary)]">Загрузка...</p>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/connect" element={<ConnectPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/lots" element={<LotsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
