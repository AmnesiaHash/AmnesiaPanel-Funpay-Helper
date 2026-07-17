import { useEffect, useMemo, useState } from 'react'
import type { LotSummary } from '../../../shared/types'
import { LotCard } from '../components/lots/LotCard'
import { LotFilters, filterLots } from '../components/lots/LotFilters'
import { BulkActions } from '../components/lots/LotFilters'
import { CopyLotModal } from '../components/copy/CopyLotModal'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/app.store'
import { useDebouncedValue, useFetchLots } from '../hooks'

/** Lots management page with search, filters, bulk ops and copy. */
export function LotsPage() {
  const lots = useAppStore((s) => s.lots)
  const loading = useAppStore((s) => s.loading)
  const error = useAppStore((s) => s.error)
  const selectedLotIds = useAppStore((s) => s.selectedLotIds)
  const { toggleLotSelection, selectAllLots, clearSelection } = useAppStore()
  const { fetchLots } = useFetchLots()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [copyLot, setCopyLot] = useState<LotSummary | null>(null)
  const [bulkModal, setBulkModal] = useState<'price' | 'title' | 'description' | 'status' | null>(null)
  const [bulkValue, setBulkValue] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [templateLot, setTemplateLot] = useState<LotSummary | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null)
  const [bulkTemplatesLoading, setBulkTemplatesLoading] = useState(false)

  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    fetchLots()
  }, [fetchLots])

  const categories = useMemo(
    () => [...new Set(lots.map((l) => l.category))].sort(),
    [lots]
  )

  const filteredLots = useMemo(
    () => filterLots(lots, debouncedSearch, categoryFilter, statusFilter, sortBy),
    [lots, debouncedSearch, categoryFilter, statusFilter, sortBy]
  )

  const handleSelectAll = () => {
    if (selectedLotIds.size === filteredLots.length) {
      clearSelection()
    } else {
      selectAllLots(filteredLots.map((l) => l.id))
    }
  }

  const handleSelectCount = (count: number) => {
    selectAllLots(filteredLots.slice(0, count).map((l) => l.id))
  }

  const handleSaveTemplate = (lot: LotSummary) => {
    setTemplateLot(lot)
    setTemplateName(lot.title)
    setTemplateError(null)
    setTemplateSuccess(null)
  }

  const confirmSaveTemplate = async () => {
    if (!templateLot || !templateName.trim()) {
      setTemplateError('Введите название шаблона')
      return
    }

    setTemplateLoading(true)
    setTemplateError(null)

    const formResult = await window.amnesia.getLotForm(templateLot.nodeId, templateLot.id)
    if (!formResult.success || !formResult.data) {
      setTemplateError(formResult.error ?? 'Не удалось загрузить данные лота')
      setTemplateLoading(false)
      return
    }

    const result = await window.amnesia.createTemplate({
      name: templateName.trim(),
      sourceLotId: templateLot.id,
      nodeId: templateLot.nodeId,
      fields: formResult.data.rawFormData
    })

    setTemplateLoading(false)

    if (result.success) {
      setTemplateSuccess(`Шаблон «${templateName.trim()}» сохранён`)
      setTemplateLot(null)
      setTemplateName('')
    } else {
      setTemplateError(result.error ?? 'Не удалось сохранить шаблон')
    }
  }

  const handleBulkToTemplates = async () => {
    const selectedLots = lots.filter((l) => selectedLotIds.has(l.id))
    if (selectedLots.length === 0) return

    setBulkTemplatesLoading(true)
    setTemplateError(null)
    setTemplateSuccess(null)

    let saved = 0
    const errors: string[] = []

    for (const lot of selectedLots) {
      const formResult = await window.amnesia.getLotForm(lot.nodeId, lot.id)
      if (!formResult.success || !formResult.data) {
        errors.push(`#${lot.id}: ${formResult.error ?? 'не удалось загрузить'}`)
        continue
      }

      const result = await window.amnesia.createTemplate({
        name: lot.title,
        sourceLotId: lot.id,
        nodeId: lot.nodeId,
        fields: formResult.data.rawFormData
      })

      if (result.success) {
        saved++
      } else {
        errors.push(`#${lot.id}: ${result.error ?? 'ошибка сохранения'}`)
      }
    }

    setBulkTemplatesLoading(false)

    if (saved > 0) {
      setTemplateSuccess(
        errors.length > 0
          ? `Сохранено ${saved} из ${selectedLots.length} шаблонов. Ошибки: ${errors.join('; ')}`
          : `Сохранено шаблонов: ${saved}`
      )
      clearSelection()
    } else {
      setTemplateError(errors.join('; ') || 'Не удалось сохранить шаблоны')
    }
  }

  const handleBulkUpdate = async () => {
    const selectedLots = lots.filter((l) => selectedLotIds.has(l.id))
    if (selectedLots.length === 0) return

    setBulkLoading(true)
    const changes: Record<string, unknown> = {}

    switch (bulkModal) {
      case 'price':
        changes.price = bulkValue
        break
      case 'title':
        changes.title = bulkValue
        break
      case 'description':
        changes.description = bulkValue
        break
      case 'status':
        changes.active = bulkValue === 'active'
        break
    }

    const result = await window.amnesia.bulkUpdate({
      lotIds: selectedLots.map((l) => ({ id: l.id, nodeId: l.nodeId })),
      changes: changes as { price?: string; title?: string; description?: string; active?: boolean }
    })

    setBulkLoading(false)
    setBulkModal(null)
    setBulkValue('')

    if (result.success) {
      fetchLots()
      clearSelection()
    }
  }

  const bulkTitles = {
    price: 'Изменить цену',
    title: 'Изменить название',
    description: 'Изменить описание',
    status: 'Изменить статус'
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold">Лоты</h2>

      <LotFilters
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        categories={categories}
        onSelectAll={handleSelectAll}
        onSelectCount={handleSelectCount}
        totalCount={filteredLots.length}
        selectedCount={selectedLotIds.size}
      />

      <BulkActions
        selectedCount={selectedLotIds.size}
        onBulkPrice={() => setBulkModal('price')}
        onBulkTitle={() => setBulkModal('title')}
        onBulkDescription={() => setBulkModal('description')}
        onBulkStatus={() => setBulkModal('status')}
        onBulkToTemplates={handleBulkToTemplates}
        onClearSelection={clearSelection}
        bulkTemplatesLoading={bulkTemplatesLoading}
      />

      {templateSuccess && (
        <p className="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">{templateSuccess}</p>
      )}

      {templateError && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{templateError}</p>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {loading && lots.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)]">Загрузка лотов...</p>
      ) : filteredLots.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)]">Лоты не найдены</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              selected={selectedLotIds.has(lot.id)}
              onSelect={toggleLotSelection}
              onCopy={setCopyLot}
              onSaveTemplate={handleSaveTemplate}
            />
          ))}
        </div>
      )}

      <CopyLotModal
        lot={copyLot}
        open={!!copyLot}
        onClose={() => setCopyLot(null)}
        onSuccess={fetchLots}
      />

      <Modal
        open={!!templateLot}
        onClose={() => {
          setTemplateLot(null)
          setTemplateError(null)
        }}
        title="Сохранить шаблон"
      >
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Лот: {templateLot?.title}
        </p>
        <input
          className="glass-input"
          placeholder="Название шаблона"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmSaveTemplate()}
        />
        {templateError && (
          <p className="mt-3 text-sm text-red-400">{templateError}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setTemplateLot(null)}>
            Отмена
          </Button>
          <Button onClick={confirmSaveTemplate} disabled={templateLoading || !templateName.trim()}>
            {templateLoading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!bulkModal}
        onClose={() => setBulkModal(null)}
        title={bulkModal ? bulkTitles[bulkModal] : ''}
      >
        {bulkModal === 'status' ? (
          <select
            className="glass-input"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
          >
            <option value="">Выберите статус</option>
            <option value="active">Активен</option>
            <option value="inactive">Неактивен</option>
          </select>
        ) : (
          <input
            className="glass-input"
            placeholder={
              bulkModal === 'price'
                ? 'Новая цена'
                : bulkModal === 'title'
                  ? 'Новое название'
                  : 'Новое описание'
            }
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
          />
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setBulkModal(null)}>
            Отмена
          </Button>
          <Button onClick={handleBulkUpdate} disabled={bulkLoading || !bulkValue}>
            {bulkLoading ? 'Применение...' : 'Применить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
