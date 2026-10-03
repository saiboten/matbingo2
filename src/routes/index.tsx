import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/toast'
import { AddListItemForm } from '../components/add-list-item-form'
import { groupByAisle, type Aisle } from '../lib/aisle'
import { useAisles } from '../lib/use-aisles'
import { describeLine, nameKey, toLines, type Line } from '../lib/shopping-lines'
import { isUnsaved, unsavedItem, useFamilyList } from '../lib/use-family-list'
import { useSimpleMode } from '../lib/use-simple-mode'
import { cn } from '../lib/utils'
import type { ShoppingListItem } from '../types'
import { Check, Minus, Pencil, Plus, ShoppingBasket, ShoppingCart, X } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: ShoppingListPage,
})

interface Basket {
  id: string
  name: string
  items: string[]
}

const COMMON_OPEN_KEY = 'matbingo-common-items-open'

function readCommonOpen(): boolean {
  try {
    return localStorage.getItem(COMMON_OPEN_KEY) !== 'closed'
  } catch {
    return true
  }
}

// Planning the shopping: putting things on the family's one list, by typing, from a basket or from
// the everyday items. The ingredients of the dinners from today on are put there automatically.
// The shopping itself is done on /shop.
export function ShoppingListPage() {
  const toast = useToast()
  const { familyId, ready, items, setItems, failed, load, addByName, removeRows, changeQuantity } = useFamilyList({
    onError: message => toast(message, 'error'),
  })
  const simple = useSimpleMode()
  const [commonItems, setCommonItems] = useState<{ name: string; aisle: Aisle }[]>([])
  const [commonOpen, setCommonOpen] = useState(readCommonOpen)
  const [baskets, setBaskets] = useState<Basket[]>([])
  const { options } = useAisles()

  useEffect(() => {
    if (!familyId) return
    const loadCommon = async () => {
      try {
        const response = await fetch('/api/common-items')
        if (response.ok) setCommonItems((await response.json()).items || [])
      } catch (error) {
        console.error('Error fetching common items:', error)
      }
    }
    const loadBaskets = async () => {
      try {
        const response = await fetch('/api/baskets')
        if (response.ok) setBaskets((await response.json()).baskets || [])
      } catch (error) {
        console.error('Error fetching baskets:', error)
      }
    }
    loadCommon()
    loadBaskets()
  }, [familyId])

  // One more of an item: the row added by hand gets one more, or one is added next to the dinners' rows
  const handleMore = (line: Line, byHand: ShoppingListItem | undefined) =>
    byHand ? changeQuantity(byHand, (byHand.quantity ?? 1) + 1) : addByName({ name: line.name })

  const toggleCommonOpen = (open: boolean) => {
    setCommonOpen(open)
    try {
      localStorage.setItem(COMMON_OPEN_KEY, open ? 'open' : 'closed')
    } catch {
      // Blocked storage: it just opens again next time
    }
  }

  // Puts everything in a basket on the list: shown at once, saved in one request, then the list is
  // fetched again so it matches what the server has
  const handleAddBasket = async (basket: Basket) => {
    const open = new Set(items.filter(item => !item.checked).map(item => nameKey(item.name)))
    const shelves = new Map(commonItems.map(item => [nameKey(item.name), item.aisle]))
    const missing = basket.items.filter(name => !open.has(nameKey(name)))
    const temps = missing.map(name =>
      unsavedItem(name, shelves.get(nameKey(name)) ?? items.find(item => nameKey(item.name) === nameKey(name))?.aisle)
    )
    const keys = new Set(missing.map(nameKey))
    setItems(prev => [...prev.filter(item => !(item.checked && keys.has(nameKey(item.name)))), ...temps])
    toast(
      missing.length > 0
        ? `La til ${missing.length} ${missing.length === 1 ? 'vare' : 'varer'} fra «${basket.name}»`
        : `Alt fra «${basket.name}» er allerede på listen`
    )
    if (missing.length === 0) return

    try {
      const response = await fetch(`/api/baskets/${basket.id}`, { method: 'POST' })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error)
    } catch (error) {
      console.error('Error adding basket:', error)
      toast(error instanceof Error && error.message ? error.message : 'Kunne ikke legge kurven i handlelisten', 'error')
    }
    await load()
  }

  // Tapping an everyday item puts it on the list; tapping it again takes it off (both at once)
  const handleChip = (common: { name: string; aisle: Aisle }, manualRow: ShoppingListItem | undefined) => {
    if (manualRow) removeRows([manualRow])
    else addByName({ name: common.name, aisle: common.aisle, sendAisle: true })
  }

  if (!ready) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (failed) {
    return (
      <div className="max-w-md space-y-3">
        <p>Kunne ikke hente handlelisten.</p>
        <Button variant="outline" onClick={load}>
          Prøv igjen
        </Button>
      </div>
    )
  }

  // What is still to be bought; what was checked off in the store is only shown there
  const openRows = items.filter(item => !item.checked)
  const openLines = toLines(openRows)

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Handleliste</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Legg til det dere trenger. Handler du nå? Trykk «Start handelen».</p>
      </div>

      <AddListItemForm onAdd={addByName} />

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Faste kurver</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/baskets/new">
              <Plus className="mr-1 h-4 w-4" />
              Ny kurv
            </Link>
          </Button>
        </div>
        {baskets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Lag en kurv med det du kjøper hver uke, så legger du alt i handlelisten med ett trykk.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {baskets.map(basket => (
              <li key={basket.id} className="flex min-w-0 items-stretch rounded-lg border">
                <button
                  type="button"
                  aria-label={`Legg ${basket.name} i handlelisten`}
                  onClick={() => handleAddBasket(basket)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-l-lg p-3 text-left hover:bg-accent disabled:opacity-60"
                >
                  <ShoppingBasket className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block break-words font-medium">{basket.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{basket.items.join(', ')}</span>
                  </span>
                  <Plus className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
                <Link
                  to="/baskets/$basketId"
                  params={{ basketId: basket.id }}
                  className="flex w-12 shrink-0 items-center justify-center rounded-r-lg border-l hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Rediger {basket.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        open={commonOpen}
        onToggle={(e) => toggleCommonOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="rounded-lg border"
      >
        <summary className="cursor-pointer select-none p-3 font-medium">Vanlige varer</summary>
        <div className="space-y-4 border-t p-3">
          {commonItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen vanlige varer i listen din ennå. Legg til noen med «Rediger listen».</p>
          )}
          {groupByAisle(commonItems, options).map(({ option, items: group }) => {
            return (
              <div key={option.value} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{option.label}</h2>
                <div className="flex flex-wrap gap-2">
                  {group.map(common => {
                    const same = openRows.filter(row => nameKey(row.name) === nameKey(common.name))
                    const fromRecipe = same.some(row => row.mealDate)
                    const manualRow = same.find(row => !row.mealDate)
                    const selected = same.length > 0
                    return (
                      <button
                        key={common.name}
                        type="button"
                        aria-pressed={selected}
                        disabled={fromRecipe || (manualRow !== undefined && isUnsaved(manualRow))}
                        title={fromRecipe ? 'Kommer fra en oppskrift' : undefined}
                        onClick={() => handleChip(common, manualRow)}
                        className={cn(
                          'flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
                          selected && !fromRecipe && 'border-primary bg-primary text-primary-foreground',
                          fromRecipe && 'cursor-default bg-muted text-muted-foreground',
                          !selected && 'hover:bg-accent'
                        )}
                      >
                        {selected && <Check className="h-4 w-4" />}
                        {common.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <Button asChild variant="ghost" size="sm">
            <Link to="/shopping-lists/common-items">
              <Pencil className="mr-1 h-4 w-4" />
              Rediger listen
            </Link>
          </Button>
        </div>
      </details>

      <section className="space-y-2">
        <h2 className="font-semibold">
          På listen <span className="font-normal text-muted-foreground">({openLines.length})</span>
        </h2>
        {openLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {simple === false ? (
              <>
                Listen er tom. Planlegg middager på{' '}
                <Link to="/meal-plan" className="text-primary hover:underline">
                  ukesmenyen
                </Link>
                , så kommer ingrediensene hit.
              </>
            ) : (
              'Listen er tom.'
            )}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {groupByAisle(openLines, options).map(({ option, items: aisleLines }) => {
              return (
                <div key={option.value} className="px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{option.label}</h3>
                  <ul>
                    {aisleLines.map(line => {
                      // The part added by hand can be changed here; the dinners' part follows the meal plan
                      const byHand = line.rows.find(row => !row.mealDate)
                      const onlyByHand = line.rows.every(row => !row.mealDate)
                      const saving = line.rows.some(isUnsaved)
                      const handQuantity = byHand?.quantity ?? 1
                      return (
                        <li key={line.key} className="flex min-h-10 items-center gap-2">
                          <span
                            aria-label={`Antall: ${line.quantity}`}
                            className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums"
                          >
                            {line.quantity}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="break-words">{line.name}</span>
                            {!onlyByHand && <span className="ml-2 text-xs text-muted-foreground">{describeLine(line)}</span>}
                          </span>
                          <span className="flex shrink-0 items-center">
                            {byHand && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => changeQuantity(byHand, handQuantity - 1)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                              >
                                {handQuantity > 1 ? <Minus className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                <span className="sr-only">{handQuantity > 1 ? `Én mindre ${line.name}` : `Fjern ${line.name}`}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleMore(line, byHand)}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">Én til {line.name}</span>
                            </button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 pt-3 sticky-bottom-bar">
        <Button asChild className="h-12 w-full text-base">
          <Link to="/shop">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Start handelen ({openLines.length} {openLines.length === 1 ? 'vare' : 'varer'})
          </Link>
        </Button>
      </div>
    </div>
  )
}
