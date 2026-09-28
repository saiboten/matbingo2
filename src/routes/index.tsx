import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/toast'
import { AddListItemForm } from '../components/add-list-item-form'
import { AISLE_LABELS, AISLE_ORDER, type Aisle } from '../lib/aisle'
import { EXTRA_SOURCE, describeSources } from '../lib/shopping-extras'
import { cn } from '../lib/utils'
import { useSimpleMode } from '../lib/use-simple-mode'
import type { ShoppingListItem } from '../types'
import { Check, Eye, EyeOff, Pencil } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: ShoppingListPage,
})

// One line on the list. The same ingredient can be on the list for several dinners (one row each);
// they are shown, and checked off, together.
interface Line {
  key: string
  name: string
  aisle: Aisle
  checked: boolean
  rows: ShoppingListItem[]
}

const nameKey = (name: string) => name.trim().toLowerCase()

const weekday = (day: string) =>
  new Intl.DateTimeFormat('nb-NO', { weekday: 'short', timeZone: 'UTC' }).format(new Date(day))

function toLines(items: ShoppingListItem[]): Line[] {
  const lines = new Map<string, Line>()
  for (const item of items) {
    const key = `${nameKey(item.name)}|${item.checked}`
    const line = lines.get(key)
    if (line) line.rows.push(item)
    else lines.set(key, { key, name: item.name, aisle: item.aisle, checked: item.checked, rows: [item] })
  }
  return Array.from(lines.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

// "fra: Taco (tor.), Suppe (lør.)" for recipe rows, "Ekstra vare" for items added by hand
function describeLine(line: Line): string {
  const sources = line.rows
    .slice()
    .sort((a, b) => (a.mealDate ?? '').localeCompare(b.mealDate ?? ''))
    .flatMap(row => (row.mealDate ? row.sources.map(source => `${source} (${weekday(row.mealDate!)})`) : [EXTRA_SOURCE]))
  return describeSources(Array.from(new Set(sources)))
}

const COMMON_OPEN_KEY = 'matbingo-common-items-open'

function readCommonOpen(): boolean {
  try {
    return localStorage.getItem(COMMON_OPEN_KEY) !== 'closed'
  } catch {
    return true
  }
}

// The family's one shopping list: the ingredients of the dinners from today on are put here
// automatically, and anything else can be added, by typing or from the everyday items.
export function ShoppingListPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const simple = useSimpleMode()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showChecked, setShowChecked] = useState(false)
  const [commonItems, setCommonItems] = useState<{ name: string; aisle: Aisle }[]>([])
  const [commonOpen, setCommonOpen] = useState(readCommonOpen)
  const [busyChip, setBusyChip] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  const load = async () => {
    setFailed(false)
    try {
      const response = await fetch('/api/shopping-list')
      if (response.ok) setItems((await response.json()).shoppingList?.items ?? [])
      else setFailed(true)
    } catch (error) {
      console.error('Error fetching shopping list:', error)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user.familyId) return
    load()
    const loadCommon = async () => {
      try {
        const response = await fetch('/api/common-items')
        if (response.ok) setCommonItems((await response.json()).items || [])
      } catch (error) {
        console.error('Error fetching common items:', error)
      }
    }
    loadCommon()
  }, [session?.user.familyId])

  const handleToggle = async (line: Line, checked: boolean) => {
    const ids = new Set(line.rows.map(row => row.id))
    const setChecked = (value: boolean) =>
      setItems(prev => prev.map(item => (ids.has(item.id) ? { ...item, checked: value } : item)))

    // Optimistic update, rolled back if the save fails
    setChecked(checked)
    try {
      const response = await fetch('/api/shopping-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(ids), checked }),
      })
      if (!response.ok) setChecked(!checked)
    } catch (error) {
      console.error('Error updating item:', error)
      setChecked(!checked)
    }
  }

  // An item that was already on the list comes back (unchecked) instead of being added twice
  const handleAdded = (item: ShoppingListItem) => setItems(prev => [...prev.filter(row => row.id !== item.id), item])

  const toggleCommonOpen = (open: boolean) => {
    setCommonOpen(open)
    try {
      localStorage.setItem(COMMON_OPEN_KEY, open ? 'open' : 'closed')
    } catch {
      // Blocked storage: it just opens again next time
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
        if (response.ok) handleAdded(data.item)
        else toast(data.error || 'Kunne ikke legge til varen', 'error')
      }
    } catch (error) {
      console.error('Error changing everyday item:', error)
      toast('Noe gikk galt', 'error')
    } finally {
      setBusyChip(null)
    }
  }

  if (isPending || loading) {
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

  const lines = toLines(items)
  const openLines = lines.filter(line => !line.checked)
  const checkedCount = lines.length - openLines.length
  const visible = showChecked ? lines : openLines
  const openRows = items.filter(item => !item.checked)

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Handleliste</h1>

      <AddListItemForm onAdded={handleAdded} />

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

      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {checkedCount} av {lines.length} varer krysset av
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-w-44 shrink-0 justify-center"
          disabled={checkedCount === 0}
          onClick={() => setShowChecked(show => !show)}
        >
          {showChecked ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
          {showChecked ? 'Skjul avkryssede' : `Vis avkryssede (${checkedCount})`}
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="text-muted-foreground">
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
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">Alle varer er krysset av.</p>
      ) : (
        <div>
          {AISLE_ORDER.map(aisle => {
            const aisleLines = visible.filter(line => line.aisle === aisle)
            if (aisleLines.length === 0) return null
            return (
              <section key={aisle}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {AISLE_LABELS[aisle]}
                  <span className="font-normal">{aisleLines.length}</span>
                </h2>
                <ul className="divide-y">
                  {aisleLines.map(line => {
                    const description = describeLine(line)
                    return (
                      <li key={line.key}>
                        <label className="flex min-h-14 cursor-pointer items-center gap-4 py-3 active:bg-muted/60">
                          <Checkbox
                            checked={line.checked}
                            onCheckedChange={(value) => handleToggle(line, value === true)}
                            className="h-6 w-6 shrink-0 [&_svg]:h-5 [&_svg]:w-5"
                          />
                          <div className={cn('min-w-0', line.checked && 'line-through text-muted-foreground')}>
                            <p className="break-words text-base font-medium">{line.name}</p>
                            {description && <p className="text-xs text-muted-foreground">{description}</p>}
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {lines.length > 0 && <AddListItemForm onAdded={handleAdded} placeholder="Legg til vare ..." label="Ny vare nederst" />}

      {simple === false && (
        <p className="text-sm text-muted-foreground">
          Havner en vare på feil hylle?{' '}
          <Link to="/ingredients" className="text-primary hover:underline">
            Rediger ingrediensene
          </Link>
        </p>
      )}
    </div>
  )
}
