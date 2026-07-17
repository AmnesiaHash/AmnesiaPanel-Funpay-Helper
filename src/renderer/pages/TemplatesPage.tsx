import { useEffect, useMemo, useState } from 'react'
import type { TemplateRecord } from '../../shared/types'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { TemplateCard, filterTemplates } from '../components/templates/TemplateCard'
import { TemplateFilters, TemplateBulkActions } from '../components/templates/TemplateFilters'
import { ApplyTemplatesModal } from '../components/templates/ApplyTemplatesModal'
import { useDebouncedValue, useJobProgress } from '../hooks'
import { useAppStore } from '../store/app.store'

/** Templates management with selection, publish, bulk import/export. */
export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishMode, setPublishMode] = useState<'pick' | 'own'>('pick')
  const [message, setMessage] = useState<string | null>(null)
  const jobProgress = useAppStore((s) => s.jobProgress)

  useJobProgress()
  const debouncedSearch = useDebouncedValue(search)

  const loadTemplates = async () => {
    setLoading(true)
    const result = await window.amnesia.listTemplates()
    if (result.success && result.data) setTemplates(result.data)
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, debouncedSearch, sortBy),
    [templates, debouncedSearch, sortBy]
  )

  const selectedTemplates = useMemo(
    () => filteredTemplates.filter((t) => selectedIds.has(t.id)),
    [filteredTemplates, selectedIds]
  )

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTemplates.map((t) => t.id)))
    }
  }

  const handleSelectCount = (count: number) => {
    setSelectedIds(new Set(filteredTemplates.slice(0, count).map((t) => t.id)))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить шаблон?')) return
    await window.amnesia.deleteTemplate(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    loadTemplates()
  }

  const handleDeleteBulk = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Удалить ${selectedIds.size} шаблонов?`)) return

    for (const id of selectedIds) {
      await window.amnesia.deleteTemplate(id)
    }
    setSelectedIds(new Set())
    loadTemplates()
  }

  const handleExport = async (id: string) => {
    const result = await window.amnesia.exportTemplate(id)
    if (result.success) setMessage(`Экспортировано: ${result.data?.path}`)
    else alert(result.error)
  }

  const handleExportBulk = async () => {
    if (selectedIds.size === 0) return
    const result = await window.amnesia.exportTemplatesBulk(Array.from(selectedIds))
    if (result.success) {
      setMessage(`Экспортировано ${result.data?.count} шаблонов: ${result.data?.path}`)
    } else if (result.error !== 'Экспорт отменён') {
      alert(result.error)
    }
  }

  const handleImport = async () => {
    const result = await window.amnesia.importTemplate()
    if (result.success && result.data) {
      setMessage(`Импортировано шаблонов: ${result.data.imported}`)
      loadTemplates()
    } else if (result.error !== 'Импорт отменён') {
      alert(result.error)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Шаблоны</h2>
        <Button variant="ghost" onClick={handleImport}>
          Импорт JSON
        </Button>
      </div>

      {message && (
        <p className="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</p>
      )}

      {jobProgress && (
        <div className="glass-card p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>{jobProgress.message ?? 'Выполнение...'}</span>
            <span>
              {jobProgress.done}/{jobProgress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${jobProgress.total ? (jobProgress.done / jobProgress.total) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      <TemplateFilters
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onSelectAll={handleSelectAll}
        onSelectCount={handleSelectCount}
        totalCount={filteredTemplates.length}
        selectedCount={selectedIds.size}
      />

      <TemplateBulkActions
        selectedCount={selectedIds.size}
        onPublish={() => {
          setPublishMode('pick')
          setPublishOpen(true)
        }}
        onPublishOwnCategories={() => {
          setPublishMode('own')
          setPublishOpen(true)
        }}
        onExportBulk={handleExportBulk}
        onDeleteBulk={handleDeleteBulk}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {loading ? (
        <p className="text-[var(--text-secondary)]">Загрузка...</p>
      ) : filteredTemplates.length === 0 ? (
        <GlassCard>
          <p className="text-center text-[var(--text-secondary)]">
            {templates.length === 0
              ? 'Шаблонов пока нет. Сохраните лот как шаблон на странице «Лоты».'
              : 'Шаблоны не найдены по фильтру.'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selected={selectedIds.has(template.id)}
              onSelect={toggleSelection}
              onDelete={handleDelete}
              onExport={handleExport}
            />
          ))}
        </div>
      )}

      <ApplyTemplatesModal
        templates={selectedTemplates}
        open={publishOpen && selectedTemplates.length > 0}
        mode={publishMode}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => {
          setMessage(
            publishMode === 'own'
              ? `Выставлено в свои категории: ${selectedTemplates.filter((t) => t.nodeId).length} шаблонов`
              : `Выставлено на FunPay: ${selectedTemplates.length} шаблонов`
          )
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
