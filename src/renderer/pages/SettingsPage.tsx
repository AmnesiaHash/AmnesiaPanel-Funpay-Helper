import { useEffect, useState } from 'react'
import type { ThemeMode } from '../../shared/types'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useAppStore, applyTheme } from '../store/app.store'
import { useNavigate } from 'react-router-dom'

/** Application settings page. */
export function SettingsPage() {
  const { theme, setTheme: setStoreTheme } = useAppStore()
  const [version, setVersion] = useState('')
  const [goldenKey, setGoldenKey] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    window.amnesia.getVersion().then((r) => {
      if (r.success && r.data) setVersion(r.data)
    })
    window.amnesia.getSettings().then((r) => {
      if (r.success && r.data) {
        setStoreTheme(r.data.theme)
        applyTheme(r.data.theme)
      }
    })
  }, [setStoreTheme])

  const handleThemeChange = async (newTheme: ThemeMode) => {
    setStoreTheme(newTheme)
    applyTheme(newTheme)
    await window.amnesia.setTheme(newTheme)
  }

  const handleTestConnection = async () => {
    setLoading(true)
    setConnectionStatus(null)
    const result = await window.amnesia.getAccount()
    setConnectionStatus(result.success ? 'Соединение успешно' : result.error ?? 'Ошибка')
    setLoading(false)
  }

  const handleChangeKey = async () => {
    if (!goldenKey.trim()) return
    setLoading(true)
    const result = await window.amnesia.connect(goldenKey.trim())
    if (result.success && result.data) {
      useAppStore.getState().setAccount(result.data)
      setConnectionStatus('Ключ обновлён')
      setGoldenKey('')
    } else {
      setConnectionStatus(result.error ?? 'Ошибка')
    }
    setLoading(false)
  }

  const handleClearData = async () => {
    if (!confirm('Удалить все локальные данные? Golden Key и настройки будут удалены.')) return
    await window.amnesia.clearData()
    useAppStore.getState().setAccount(null)
    useAppStore.getState().setConnected(false)
    navigate('/connect')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Настройки</h2>

      <GlassCard title="Тема">
        <div className="flex gap-3">
          {(['dark', 'light', 'system'] as ThemeMode[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`rounded-xl px-4 py-2 text-sm transition-all ${
                theme === t
                  ? 'bg-accent/20 text-accent-light ring-2 ring-accent'
                  : 'bg-[var(--glass-bg)] hover:bg-accent/10'
              }`}
            >
              {t === 'dark' ? 'Тёмная' : t === 'light' ? 'Светлая' : 'Системная'}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Golden Key">
        <div className="space-y-3">
          <input
            type="password"
            className="glass-input"
            placeholder="Новый Golden Key"
            value={goldenKey}
            onChange={(e) => setGoldenKey(e.target.value)}
          />
          <div className="flex gap-3">
            <Button onClick={handleChangeKey} disabled={loading || !goldenKey.trim()}>
              Сменить ключ
            </Button>
            <Button variant="ghost" onClick={handleTestConnection} disabled={loading}>
              Проверить соединение
            </Button>
          </div>
          {connectionStatus && (
            <p
              className={`text-sm ${connectionStatus.includes('Ошибка') || connectionStatus.includes('ошибка') ? 'text-red-400' : 'text-green-400'}`}
            >
              {connectionStatus}
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Данные">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Удаляет Golden Key, шаблоны, историю и настройки из локального хранилища.
        </p>
        <Button variant="ghost" onClick={handleClearData} className="text-red-400">
          Очистить локальные данные
        </Button>
      </GlassCard>

      <GlassCard title="О приложении">
        <p className="text-sm">
          <strong>AmnesiaPanel</strong> v{version || '1.0.0'}
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Бесплатное open-source приложение для управления лотами FunPay.
        </p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Создатель:{' '}
          <a
            href="https://t.me/AmnesiaOwner"
            target="_blank"
            rel="noreferrer"
            className="text-accent-light hover:underline"
          >
            @AmnesiaOwner
          </a>
        </p>
      </GlassCard>
    </div>
  )
}
