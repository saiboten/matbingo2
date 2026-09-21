import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/toast'
import { AISLE_LABELS, AISLE_ORDER } from '../lib/aisle'
import { formatDate } from '../lib/utils'
import type { ShoppingList, ShoppingListItem } from '../types'
import { Eye, EyeOff, Plus } from 'lucide-react'

export const Route = createFileRoute('/simple')({
  component: SimpleListPage,
})

// The simple mode: only the latest shopping list, where items can be crossed off and added
export function SimpleListPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [hideChecked, setHideChecked] = useState(false)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

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
      const response = await fetch('/api/shopping-lists/latest')
      if (response.ok) setList((await response.json()).shoppingList ?? null)
      else setFailed(true)
    } catch (error) {
      console.error('Error fetching latest shopping list:', error)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user.familyId) load()
  }, [session])

  const setItems = (update: (items: ShoppingListItem[]) => ShoppingListItem[]) =>
    setList(prev => prev && { ...prev, items: update(prev.items ?? []) })

  const handleToggle = async (itemId: string, checked: boolean) => {
    if (!list || !session?.user.familyId) return
    const setChecked = (value: boolean) => setItems(items => items.map(item => (item.id === itemId ? { ...item, checked: value } : item)))

    // Optimistic update, rolled back if the save fails
    setChecked(checked)
    try {
      const response = await fetch(`/api/shopping-lists/${list.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: session.user.familyId, itemId, checked }),
      })
      if (!response.ok) setChecked(!checked)
    } catch (error) {
      console.error('Error updating item:', error)
      setChecked(!checked)
    }
  }

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!list || !trimmed) return
    setAdding(true)
    try {
      const response = await fetch(`/api/shopping-lists/${list.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        // An item that was already there comes back (unchecked) instead of being added twice
        setItems(items => [...items.filter(item => item.id !== data.item.id), data.item])
        setName('')
      } else {
        toast(data.error || 'Kunne ikke legge til varen', 'error')
      }
    } catch (error) {
      console.error('Error adding item:', error)
      toast('Kunne ikke legge til varen', 'error')
    } finally {
      setAdding(false)
    }
  }

  if (isPending || loading) {
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

  if (!list) {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold">Handleliste</h1>
        <p className="text-muted-foreground">Det er ikke laget noen handleliste ennå.</p>
      </div>
    )
  }

  const items = list.items ?? []
  const sorted = [...items].sort((a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) || a.name.localeCompare(b.name, 'nb'))
  const checkedCount = items.filter(item => item.checked).length
  const visible = hideChecked ? sorted.filter(item => !item.checked) : sorted

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Handleliste</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Laget {formatDate(new Date(list.createdAt))}</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Legg til en vare ..." aria-label="Ny vare" maxLength={100} />
        <Button type="submit" disabled={adding || !name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Legg til
        </Button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {checkedCount} av {items.length} varer krysset av
        </p>
        <Button variant="outline" size="sm" className="min-w-44 shrink-0 justify-center" disabled={checkedCount === 0} onClick={() => setHideChecked(h => !h)}>
          {hideChecked ? <Eye className="mr-1 h-4 w-4" /> : <EyeOff className="mr-1 h-4 w-4" />}
          {hideChecked ? `Vis avkryssede (${checkedCount})` : 'Skjul avkryssede'}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ingen varer i listen.</p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground">Alle varer er krysset av.</p>
      ) : (
        <div>
          {AISLE_ORDER.map(aisle => {
            const aisleItems = visible.filter(item => item.aisle === aisle)
            if (aisleItems.length === 0) return null
            return (
              <section key={aisle}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {AISLE_LABELS[aisle]}
                  <span className="font-normal">{aisleItems.length}</span>
                </h2>
                <ul className="divide-y">
                  {aisleItems.map(item => (
                    <li key={item.id}>
                      <label className="flex min-h-14 cursor-pointer items-center gap-4 py-3 active:bg-muted/60">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(value) => handleToggle(item.id, value === true)}
                          className="h-6 w-6 shrink-0 [&_svg]:h-5 [&_svg]:w-5"
                        />
                        <p className={`min-w-0 break-words text-base font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>{item.name}</p>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
