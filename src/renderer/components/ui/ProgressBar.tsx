interface ProgressBarProps {
  done: number
  total: number
  message?: string
  etaMs?: number
}

/** Progress bar for bulk operations. */
export function ProgressBar({ done, total, message, etaMs }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const eta =
    etaMs && etaMs > 0
      ? `${Math.ceil(etaMs / 1000)} сек.`
      : '—'

  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{message ?? 'Выполнение...'}</span>
        <span>
          {done} / {total} ({percent}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--glass-bg)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {total > 0 && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">Осталось ~{eta}</p>
      )}
    </div>
  )
}
