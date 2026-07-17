import { useEffect, useState } from 'react'
import type { HistoryEntry } from '../../shared/types'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'

const operationLabels: Record<string, string> = {
  connect: 'Подключение',
  fetch_lots: 'Загрузка лотов',
  clone_lot: 'Копирование',
  bulk_update: 'Массовое обновление',
  save_template: 'Сохранение шаблона',
  apply_template: 'Применение шаблона',
  import_template: 'Импорт шаблона',
  export_template: 'Экспорт шаблона'
}

const statusColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  partial: 'text-yellow-400'
}

/** Operation history log page. */
export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = async () => {
    setLoading(true)
    const result = await window.amnesia.getHistory(200)
    if (result.success && result.data) setEntries(result.data)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleClear = async () => {
    if (!confirm('Очистить всю историю?')) return
    await window.amnesia.clearHistory()
    loadHistory()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">История</h2>
        <Button variant="ghost" onClick={handleClear}>
          Очистить
        </Button>
      </div>

      <GlassCard className="overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-[var(--text-secondary)]">Загрузка...</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-center text-[var(--text-secondary)]">История пуста</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--glass-border)] text-left text-[var(--text-secondary)]">
                  <th className="px-4 py-3 font-medium">Дата / Время</th>
                  <th className="px-4 py-3 font-medium">Операция</th>
                  <th className="px-4 py-3 font-medium">ID лота</th>
                  <th className="px-4 py-3 font-medium">Категория</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-bg)]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      {operationLabels[entry.operationType] ?? entry.operationType}
                    </td>
                    <td className="px-4 py-3">{entry.lotId ?? '—'}</td>
                    <td className="px-4 py-3">{entry.category ?? '—'}</td>
                    <td className={`px-4 py-3 ${statusColors[entry.status]}`}>
                      {entry.status === 'success' ? 'Успех' : entry.status === 'error' ? 'Ошибка' : 'Частично'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-red-400">
                      {entry.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
