import { useEffect } from 'react'
import { GlassCard } from '../components/ui/GlassCard'
import { useAppStore } from '../store/app.store'
import { useFetchLots } from '../hooks'

/** Dashboard home page with account overview. */
export function HomePage() {
  const account = useAppStore((s) => s.account)
  const lots = useAppStore((s) => s.lots)
  const { fetchLots } = useFetchLots()

  useEffect(() => {
    if (lots.length === 0) fetchLots()
  }, [fetchLots, lots.length])

  const activeLots = lots.filter((l) => l.status === 'active').length
  const categories = new Set(lots.map((l) => l.category)).size

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Главная</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">Аккаунт</p>
          <p className="mt-1 text-xl font-semibold">{account?.username ?? '—'}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">Всего лотов</p>
          <p className="mt-1 text-xl font-semibold">{lots.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)]">Активных / Категорий</p>
          <p className="mt-1 text-xl font-semibold">
            {activeLots} / {categories}
          </p>
        </GlassCard>
      </div>

      <GlassCard title="Быстрый старт">
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>📦 Перейдите в «Лоты» для управления объявлениями</li>
          <li>📋 Сохраняйте лоты как шаблоны для повторного использования</li>
          <li>📜 История операций доступна в соответствующем разделе</li>
        </ul>
      </GlassCard>
    </div>
  )
}
