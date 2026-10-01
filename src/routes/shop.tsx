import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/toast'
import { AddListItemForm } from '../components/add-list-item-form'
import { groupByAisle } from '../lib/aisle'
import { useAisles } from '../lib/use-aisles'
import { describeLine, toLines, type Line } from '../lib/shopping-lines'
import { isUnsaved, useFamilyList } from '../lib/use-family-list'
import { useSimpleMode } from '../lib/use-simple-mode'
import { cn } from '../lib/utils'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/shop')({
  component: ShopPage,
})

// Doing the shopping: the list by shelf, checked off while walking the store. Planning what to buy
// happens on the home page.
export function ShopPage() {
  const toast = useToast()
  const { ready, items, setItems, failed, load, addByName } = useFamilyList({ onError: message => toast(message, 'error') })
  const simple = useSimpleMode()
  const [showChecked, setShowChecked] = useState(false)
  const { options } = useAisles()

  const handleToggle = async (line: Line, checked: boolean) => {
    // A row the server has not saved yet (just added) is left as it is
    const ids = new Set(line.rows.filter(row => !isUnsaved(row)).map(row => row.id))
    if (ids.size === 0) return
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

  if (!ready) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-48" />
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

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til handlelisten</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">I butikken</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Kryss av etter hvert som du legger varene i kurven.</p>
        </div>
      </div>

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
        <div className="space-y-3">
          <p className="text-muted-foreground">Det er ingenting på handlelisten.</p>
          <Button asChild variant="outline">
            <Link to="/">Legg til varer</Link>
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">Alle varer er krysset av.</p>
      ) : (
        <div>
          {groupByAisle(visible, options).map(({ option, items: aisleLines }) => {
            return (
              <section key={option.value}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {option.label}
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
                          {line.quantity > 1 && (
                            <span
                              aria-label={`Antall: ${line.quantity}`}
                              className={cn(
                                'ml-auto shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums',
                                line.checked && 'text-muted-foreground'
                              )}
                            >
                              {line.quantity} stk
                            </span>
                          )}
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

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Glemt noe?</h2>
        <AddListItemForm onAdd={addByName} placeholder="Legg til vare ..." label="Ny vare" />
      </div>

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
