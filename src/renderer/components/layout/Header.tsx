import { Button } from '../ui/Button'
import { useAppStore } from '../../store/app.store'
import { useFetchLots } from '../../hooks'
import { useEffect, useState } from 'react'

/** Top header with account info and refresh button. */
export function Header() {
  const account = useAppStore((s) => s.account)
  const loading = useAppStore((s) => s.loading)
  const { fetchLots } = useFetchLots()
  const [avatarFailed, setAvatarFailed] = useState(false)

  const avatarLetter = account?.username?.charAt(0)?.toUpperCase() ?? 'A'
  const showAvatar = account?.avatarUrl && !avatarFailed

  useEffect(() => {
    setAvatarFailed(false)
  }, [account?.avatarUrl])

  return (
    <header className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-4">
      <div className="flex items-center gap-3">
        {showAvatar ? (
          <img
            src={account.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-xl object-cover ring-2 ring-accent/30"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-lg font-bold text-white">
            {avatarLetter}
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold">AmnesiaPanel</h1>
          <p className="text-xs text-[var(--text-secondary)]">FunPay Management</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {account && (
          <div className="text-right text-sm">
            <p className="font-medium">{account.username}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              ID: {account.userId}
              {account.balance !== undefined && ` · ${account.balance} ₽`}
            </p>
          </div>
        )}
        <Button variant="ghost" onClick={() => fetchLots()} disabled={loading}>
          {loading ? '⏳' : '🔄'} Обновить
        </Button>
      </div>
    </header>
  )
}
