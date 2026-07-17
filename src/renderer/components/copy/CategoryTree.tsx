import { useMemo, useState } from 'react'

import type { CategoryNode } from '../../../shared/types'

import { flattenSubcategories } from '../../../shared/category-utils'



interface CategoryTreeProps {

  categories: CategoryNode[]

  selected: Set<string>

  onSelectionChange: (next: Set<string>) => void

}



/** Hierarchical game → subcategory tree with bulk selection. */

export function CategoryTree({ categories, selected, onSelectionChange }: CategoryTreeProps) {

  const [search, setSearch] = useState('')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [selectCount, setSelectCount] = useState('')



  const allSubcategories = useMemo(() => flattenSubcategories(categories), [categories])



  const filteredGames = useMemo(() => {

    const q = search.trim().toLowerCase()

    if (!q) return categories



    return categories

      .map((game) => {

        const gameMatch = game.name.toLowerCase().includes(q)

        const children = (game.children ?? []).filter(

          (child) =>

            child.name.toLowerCase().includes(q) ||

            child.fullName?.toLowerCase().includes(q) ||

            gameMatch

        )



        if (gameMatch || children.length > 0) {

          return { ...game, children }

        }

        return null

      })

      .filter((game): game is CategoryNode => game !== null)

  }, [categories, search])



  const visibleSubcategories = useMemo(

    () => flattenSubcategories(filteredGames),

    [filteredGames]

  )



  const allVisibleSelected =

    visibleSubcategories.length > 0 &&

    visibleSubcategories.every((item) => selected.has(item.id))



  const toggleExpanded = (gameId: string) => {

    setExpanded((prev) => {

      const next = new Set(prev)

      if (next.has(gameId)) next.delete(gameId)

      else next.add(gameId)

      return next

    })

  }



  const toggleSubcategory = (id: string) => {

    const next = new Set(selected)

    if (next.has(id)) next.delete(id)

    else next.add(id)

    onSelectionChange(next)

  }



  const toggleGameChildren = (game: CategoryNode) => {

    const childIds = (game.children ?? []).map((child) => child.id)

    const allSelected = childIds.length > 0 && childIds.every((id) => selected.has(id))

    const next = new Set(selected)



    for (const id of childIds) {

      if (allSelected) next.delete(id)

      else next.add(id)

    }



    onSelectionChange(next)

  }



  const handleSelectAll = () => {

    if (allVisibleSelected) {

      const next = new Set(selected)

      for (const item of visibleSubcategories) next.delete(item.id)

      onSelectionChange(next)

      return

    }



    const next = new Set(selected)

    for (const item of visibleSubcategories) next.add(item.id)

    onSelectionChange(next)

  }



  const handleSelectCount = () => {

    const count = Number.parseInt(selectCount, 10)

    if (!Number.isFinite(count) || count <= 0) return



    const next = new Set(selected)

    const slice = visibleSubcategories.slice(0, count)

    for (const item of slice) next.add(item.id)

    onSelectionChange(next)

  }



  const isSearching = search.trim().length > 0



  return (

    <div className="flex h-full flex-col">

      <input

        className="glass-input mb-3 py-2 text-sm"

        placeholder="Поиск игр и категорий..."

        value={search}

        onChange={(e) => setSearch(e.target.value)}

      />



      <div className="mb-3 space-y-2 rounded-xl border border-[var(--glass-border)] p-3">

        <label className="flex cursor-pointer items-center gap-3">

          <input

            type="checkbox"

            checked={allVisibleSelected}

            onChange={handleSelectAll}

            className="h-4 w-4 rounded accent-accent"

          />

          <span className="text-sm">

            Выбрать все{isSearching ? ' (из результатов поиска)' : ''}

          </span>

          <span className="ml-auto text-xs text-[var(--text-secondary)]">

            {visibleSubcategories.length} шт.

          </span>

        </label>



        <div className="flex items-center gap-2">

          <input

            className="glass-input w-24 py-1.5 text-sm"

            type="number"

            min={1}

            placeholder="N"

            value={selectCount}

            onChange={(e) => setSelectCount(e.target.value)}

          />

          <button

            type="button"

            className="rounded-lg border border-[var(--glass-border)] px-3 py-1.5 text-sm hover:bg-[var(--glass-bg)]"

            onClick={handleSelectCount}

          >

            Выбрать N

          </button>

          <span className="text-xs text-[var(--text-secondary)]">первых из списка</span>

        </div>

      </div>



      <div className="flex-1 overflow-auto rounded-xl border border-[var(--glass-border)] p-2">

        {filteredGames.length === 0 ? (

          <p className="p-4 text-center text-sm text-[var(--text-secondary)]">

            Категории не найдены

          </p>

        ) : (

          filteredGames.map((game) => {

            const childIds = (game.children ?? []).map((child) => child.id)

            const selectedInGame = childIds.filter((id) => selected.has(id)).length

            const isOpen = isSearching || expanded.has(game.id)

            const allGameSelected =

              childIds.length > 0 && childIds.every((id) => selected.has(id))



            return (

              <div key={game.id} className="mb-1">

                <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--glass-bg)]">

                  <button

                    type="button"

                    className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--text-secondary)]"

                    onClick={() => toggleExpanded(game.id)}

                    aria-label={isOpen ? 'Свернуть' : 'Развернуть'}

                  >

                    {isOpen ? '▾' : '▸'}

                  </button>



                  <input

                    type="checkbox"

                    checked={allGameSelected}

                    onChange={() => toggleGameChildren(game)}

                    className="h-4 w-4 shrink-0 rounded accent-accent"

                    title="Выбрать все подкатегории игры"

                  />



                  <button

                    type="button"

                    className="flex flex-1 items-center gap-2 text-left"

                    onClick={() => toggleExpanded(game.id)}

                  >

                    <span className="text-sm font-medium">{game.name}</span>

                    <span className="text-xs text-[var(--text-secondary)]">

                      {selectedInGame}/{childIds.length}

                    </span>

                  </button>

                </div>



                {isOpen && (

                  <div className="ml-8 border-l border-[var(--glass-border)] pl-2">

                    {(game.children ?? []).map((child) => (

                      <label

                        key={child.id}

                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--glass-bg)]"

                      >

                        <input

                          type="checkbox"

                          checked={selected.has(child.id)}

                          onChange={() => toggleSubcategory(child.id)}

                          className="h-4 w-4 rounded accent-accent"

                        />

                        <span className="text-sm">{child.name}</span>

                        <span className="ml-auto text-xs text-[var(--text-secondary)]">

                          #{child.id}

                        </span>

                      </label>

                    ))}

                  </div>

                )}

              </div>

            )

          })

        )}

      </div>



      <p className="mt-2 text-xs text-[var(--text-secondary)]">

        Выбрано категорий: {selected.size} из {allSubcategories.length}

      </p>

    </div>

  )

}



export { getSelectedCategoryNames } from '../../../shared/category-utils'


