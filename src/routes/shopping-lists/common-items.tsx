import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toast'
import { AISLE_LABELS, AISLE_ORDER, type Aisle } from '../../lib/aisle'
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

// The family's own list of everyday items, offered as one-tap extras when making a shopping list
export function CommonItemsPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState<CommonItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [aisle, setAisle] = useState<Aisle | 'AUTO'>('AUTO')

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
  }, [session])

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      const response = await fetch('/api/common-items', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: trimmed, ...(aisle !== 'AUTO' ? { aisle } : {}) }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setItems(prev => [...prev, data.item].sort((a, b) => a.name.localeCompare(b.name, 'nb')))
        setName('')
      } else {
        toast(data.error || 'Kunne ikke legge til varen', 'error')
      }
    } catch (error) {
      console.error('Error adding common item:', error)
      toast('Kunne ikke legge til varen', 'error')
    }
  }

  const handleChangeAisle = async (id: string, next: Aisle) => {
    const previous = items.find(item => item.id === id)?.aisle
    const set = (value: Aisle) => setItems(prev => prev.map(item => (item.id === id ? { ...item, aisle: value } : item)))

    // Optimistic update, rolled back if the save fails
    set(next)
    const rollback = () => {
      if (previous) set(previous)
      toast('Kunne ikke endre avdelingen', 'error')
    }
    try {
      const response = await fetch('/api/common-items', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ id, aisle: next }) })
      if (!response.ok) rollback()
    } catch (error) {
      console.error('Error changing aisle:', error)
      rollback()
    }
  }

  const handleRemove = async (item: CommonItemRow) => {
    try {
      const response = await fetch('/api/common-items', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ id: item.id }) })
      if (response.ok) setItems(prev => prev.filter(row => row.id !== item.id))
      else toast(`Kunne ikke fjerne ${item.name}`, 'error')
    } catch (error) {
      console.error('Error removing common item:', error)
      toast(`Kunne ikke fjerne ${item.name}`, 'error')
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
          <Link to="/shopping-lists">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til handlelistene</span>
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
        <Select value={aisle} onValueChange={(value) => setAisle(value as Aisle | 'AUTO')}>
          <SelectTrigger className="sm:w-56" aria-label="Gang for ny vare">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUTO">Velg gang automatisk</SelectItem>
            {AISLE_ORDER.map(option => (
              <SelectItem key={option} value={option}>
                {AISLE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={!name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Legg til
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ingen vanlige varer. Legg til noen ovenfor.</p>
      ) : (
        <div>
          {AISLE_ORDER.map(group => {
            const groupItems = items.filter(item => item.aisle === group)
            if (groupItems.length === 0) return null
            return (
              <section key={group}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {AISLE_LABELS[group]}
                  <span className="font-normal">{groupItems.length}</span>
                </h2>
                <ul className="divide-y">
                  {groupItems.map(item => (
                    <li key={item.id} className="flex min-h-14 items-center justify-between gap-2 py-2">
                      <span className="min-w-0 break-words font-medium">{item.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Select value={item.aisle} onValueChange={(value) => handleChangeAisle(item.id, value as Aisle)}>
                          <SelectTrigger className="w-40 sm:w-52" aria-label={`Gang for ${item.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AISLE_ORDER.map(option => (
                              <SelectItem key={option} value={option}>
                                {AISLE_LABELS[option]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(item)}>
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
