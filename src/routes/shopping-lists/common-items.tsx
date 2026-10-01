import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { SelectItem } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toast'
import { AisleSelect } from '../../components/aisle-select'
import { groupByAisle, guessAisle, type Aisle } from '../../lib/aisle'
import { useAisles } from '../../lib/use-aisles'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/shopping-lists/common-items')({
  component: CommonItemsPage,
})

interface CommonItemRow {
  id: string
  name: string
  aisle: Aisle
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Rows shown before the server has saved them; they cannot be changed until it has
const TEMP_PREFIX = 'pending-'
let tempCounter = 0
const isUnsaved = (item: CommonItemRow) => item.id.startsWith(TEMP_PREFIX)
const byName = (a: CommonItemRow, b: CommonItemRow) => a.name.localeCompare(b.name, 'nb')

// The family's own list of everyday items, offered as one-tap extras when making a shopping list
export function CommonItemsPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState<CommonItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [aisle, setAisle] = useState<Aisle | 'AUTO'>('AUTO')
  const { options } = useAisles()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (!session?.user.familyId) return
    const load = async () => {
      try {
        const response = await fetch('/api/common-items')
        if (response.ok) setItems((await response.json()).items || [])
        else toast('Kunne ikke hente vanlige varer', 'error')
      } catch (error) {
        console.error('Error fetching common items:', error)
        toast('Kunne ikke hente vanlige varer', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.user.familyId])

  // The item shows at once (on the aisle picked, else a guess) and the field is cleared for the next
  // one; it is swapped for the saved row, or taken off again with a message if saving fails
  const handleAdd = async () => {
    const trimmed = name.replace(/\s+/g, ' ').trim()
    if (!trimmed) return
    const existing = items.find(item => item.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      toast(`«${existing.name}» er allerede i listen`, 'error')
      return
    }

    const temp: CommonItemRow = { id: `${TEMP_PREFIX}${++tempCounter}`, name: trimmed, aisle: aisle !== 'AUTO' ? aisle : guessAisle(trimmed) }
    setItems(prev => [...prev, temp].sort(byName))
    setName('')
    const fail = (message: string) => {
      setItems(prev => prev.filter(item => item.id !== temp.id))
      toast(message, 'error')
    }
    try {
      const response = await fetch('/api/common-items', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: trimmed, ...(aisle !== 'AUTO' ? { aisle } : {}) }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) setItems(prev => prev.map(item => (item.id === temp.id ? data.item : item)).sort(byName))
      else fail(data.error || 'Kunne ikke legge til varen')
    } catch (error) {
      console.error('Error adding common item:', error)
      fail('Kunne ikke legge til varen')
    }
  }

  const handleChangeAisle = async (id: string, next: Aisle) => {
    const previous = items.find(item => item.id === id)?.aisle
    const set = (value: Aisle) => setItems(prev => prev.map(item => (item.id === id ? { ...item, aisle: value } : item)))

    // Optimistic update, rolled back if the save fails
    set(next)
    const rollback = () => {
      if (previous) set(previous)
      toast('Kunne ikke endre hyllen', 'error')
    }
    try {
      const response = await fetch('/api/common-items', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ id, aisle: next }) })
      if (!response.ok) rollback()
    } catch (error) {
      console.error('Error changing aisle:', error)
      rollback()
    }
  }

  // Taken off at once, put back if deleting fails
  const handleRemove = async (item: CommonItemRow) => {
    setItems(prev => prev.filter(row => row.id !== item.id))
    const putBack = () => {
      setItems(prev => [...prev, item].sort(byName))
      toast(`Kunne ikke fjerne ${item.name}`, 'error')
    }
    try {
      const response = await fetch('/api/common-items', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ id: item.id }) })
      if (!response.ok) putBack()
    } catch (error) {
      console.error('Error removing common item:', error)
      putBack()
    }
  }

  if (isPending || loading) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold">Vanlige varer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Varene familien vanligvis trenger. De dukker opp når du lager en handleliste.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          handleAdd()
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ny vare ..." aria-label="Ny vare" maxLength={100} />
        <AisleSelect
          value={aisle}
          onValueChange={setAisle}
          ariaLabel="Hylle for ny vare"
          className="sm:w-56"
          leading={<SelectItem value="AUTO">Velg hylle automatisk</SelectItem>}
        />
        <Button type="submit" disabled={!name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Legg til
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ingen vanlige varer. Legg til noen ovenfor.</p>
      ) : (
        <div>
          {groupByAisle(items, options).map(({ option: group, items: groupItems }) => {
            return (
              <section key={group.value}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {group.label}
                  <span className="font-normal">{groupItems.length}</span>
                </h2>
                <ul className="divide-y">
                  {groupItems.map(item => (
                    <li key={item.id} className="flex min-h-14 items-center justify-between gap-2 py-2">
                      <span className="min-w-0 break-words font-medium">{item.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <AisleSelect
                          value={item.aisle}
                          onValueChange={(value) => handleChangeAisle(item.id, value)}
                          ariaLabel={`Hylle for ${item.name}`}
                          className="w-40 sm:w-52"
                          disabled={isUnsaved(item)}
                        />
                        <Button type="button" variant="ghost" size="icon" disabled={isUnsaved(item)} onClick={() => handleRemove(item)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Fjern {item.name}</span>
                        </Button>
                      </div>
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
