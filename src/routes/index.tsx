import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/toast'
import { AddListItemForm } from '../components/add-list-item-form'
import { AISLE_LABELS, AISLE_ORDER, type Aisle } from '../lib/aisle'
import { describeLine, nameKey, toLines, type Line } from '../lib/shopping-lines'
import { useFamilyList } from '../lib/use-family-list'
import { useSimpleMode } from '../lib/use-simple-mode'
import { cn } from '../lib/utils'
import type { ShoppingListItem } from '../types'
import { Check, Pencil, Plus, ShoppingBasket, ShoppingCart, X } from 'lucide-react'

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
  const { familyId, ready, items, setItems, failed, load, addItem } = useFamilyList()
  const toast = useToast()
  const simple = useSimpleMode()
  const [commonItems, setCommonItems] = useState<{ name: string; aisle: Aisle }[]>([])
  const [commonOpen, setCommonOpen] = useState(readCommonOpen)
  const [busyChip, setBusyChip] = useState<string | null>(null)
  const [baskets, setBaskets] = useState<Basket[]>([])
  const [busyBasket, setBusyBasket] = useState<string | null>(null)

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

  // Takes an item added by hand off the list; recipe items follow the meal plan
  const handleRemove = async (line: Line) => {
    const ids = line.rows.map(row => row.id)
    try {
      const results = await Promise.all(
        ids.map(id => fetch(`/api/shopping-list?itemId=${encodeURIComponent(id)}`, { method: 'DELETE' }))
      )
      const removed = new Set(ids.filter((_, i) => results[i].ok))
      setItems(prev => prev.filter(item => !removed.has(item.id)))
      if (removed.size < ids.length) toast(`Kunne ikke fjerne ${line.name}`, 'error')
    } catch (error) {
      console.error('Error removing item:', error)
      toast(`Kunne ikke fjerne ${line.name}`, 'error')
    }
  }

  const toggleCommonOpen = (open: boolean) => {
    setCommonOpen(open)
    try {
      localStorage.setItem(COMMON_OPEN_KEY, open ? 'open' : 'closed')
    } catch {
      // Blocked storage: it just opens again next time
    }
  }

  // Puts everything in a basket on the list, then shows the list as the server has it
  const handleAddBasket = async (basket: Basket) => {
    setBusyBasket(basket.id)
    try {
      const response = await fetch(`/api/baskets/${basket.id}`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        toast(
          data.added > 0
            ? `La til ${data.added} ${data.added === 1 ? 'vare' : 'varer'} fra «${basket.name}»`
            : `Alt fra «${basket.name}» er allerede på listen`
        )
        await load()
      } else {
        toast(data.error || 'Kunne ikke legge kurven i handlelisten', 'error')
      }
    } catch (error) {
      console.error('Error adding basket:', error)
      toast('Kunne ikke legge kurven i handlelisten', 'error')
    } finally {
      setBusyBasket(null)
    }
  }

  // Tapping an everyday item puts it on the list; tapping it again takes it off
  const handleChip = async (common: { name: string; aisle: Aisle }, manualRow: ShoppingListItem | undefined) => {
    setBusyChip(common.name)
    try {
      if (manualRow) {
        const response = await fetch(`/api/shopping-list?itemId=${encodeURIComponent(manualRow.id)}`, { method: 'DELETE' })
        if (response.ok) setItems(prev => prev.filter(item => item.id !== manualRow.id))
        else toast('Kunne ikke fjerne varen', 'error')
      } else {
        const response = await fetch('/api/shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: common.name, aisle: common.aisle }),
        })
        const data = await response.json().catch(() => ({}))
        if (response.ok) addItem(data.item)
        else toast(data.error || 'Kunne ikke legge til varen', 'error')
      }
    } catch (error) {
      console.error('Error changing everyday item:', error)
      toast('Noe gikk galt', 'error')
    } finally {
      setBusyChip(null)
    }
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

      <AddListItemForm onAdded={addItem} />

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
          <ul className="grid gap-2 sm:grid-cols-2">
            {baskets.map(basket => (
              <li key={basket.id} className="flex items-stretch rounded-lg border">
                <button
                  type="button"
                  aria-label={`Legg ${basket.name} i handlelisten`}
                  disabled={busyBasket === basket.id}
                  onClick={() => handleAddBasket(basket)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-l-lg p-3 text-left hover:bg-accent disabled:opacity-60"
                >
                  <ShoppingBasket className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block font-medium">{basket.name}</span>
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
          {AISLE_ORDER.map(aisle => {
            const group = commonItems.filter(item => item.aisle === aisle)
            if (group.length === 0) return null
            return (
              <div key={aisle} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{AISLE_LABELS[aisle]}</h2>
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
                        disabled={fromRecipe || busyChip === common.name}
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
            {AISLE_ORDER.map(aisle => {
              const aisleLines = openLines.filter(line => line.aisle === aisle)
              if (aisleLines.length === 0) return null
              return (
                <div key={aisle} className="px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{AISLE_LABELS[aisle]}</h3>
                  <ul>
                    {aisleLines.map(line => {
                      const byHand = line.rows.every(row => !row.mealDate)
                      return (
                        <li key={line.key} className="flex min-h-10 items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="break-words">{line.name}</span>
                            {!byHand && <span className="ml-2 text-xs text-muted-foreground">{describeLine(line)}</span>}
                          </span>
                          {byHand && (
                            <button
                              type="button"
                              onClick={() => handleRemove(line)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Fjern {line.name}</span>
                            </button>
                          )}
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

      <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 py-3">
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
