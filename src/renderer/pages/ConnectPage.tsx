import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/app.store'

/** First-run account connection page. */
export function ConnectPage() {
  const [goldenKey, setGoldenKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setAccount, setConnected, connected } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (connected) navigate('/', { replace: true })
  }, [connected, navigate])

  const handleConnect = async () => {
    if (!goldenKey.trim()) {
      setError('Введите Golden Key')
      return
    }

    setLoading(true)
    setError(null)

    const result = await window.amnesia.connect(goldenKey.trim())
    if (result.success && result.data) {
      setAccount(result.data)
      setConnected(true)
      navigate('/')
    } else {
      setError(result.error ?? 'Не удалось подключиться')
    }
    setLoading(false)
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg-primary)] p-6">
      <GlassCard className="w-full max-w-md animate-slide-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark text-2xl font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-bold">Подключение аккаунта FunPay</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Введите Golden Key из cookies браузера
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Golden Key</label>
            <input
              type="password"
              className="glass-input"
              placeholder="Вставьте ваш Golden Key"
              value={goldenKey}
              onChange={(e) => setGoldenKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
          )}

          <Button className="w-full" onClick={handleConnect} disabled={loading}>
            {loading ? 'Подключение...' : 'Подключить'}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
