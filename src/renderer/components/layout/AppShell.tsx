import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ProgressBar } from '../ui/ProgressBar'
import { useAppStore } from '../../store/app.store'
import { useJobProgress } from '../../hooks'

/** Main application shell with sidebar and header. */
export function AppShell() {
  const jobProgress = useAppStore((s) => s.jobProgress)
  useJobProgress()

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          {jobProgress && (
            <div className="mb-4">
              <ProgressBar
                done={jobProgress.done}
                total={jobProgress.total}
                message={jobProgress.message}
                etaMs={jobProgress.etaMs}
              />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
