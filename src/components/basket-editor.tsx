import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Skeleton } from './ui/skeleton'
import { useToast } from './ui/toast'
import { AISLE_LABELS, AISLE_ORDER, type Aisle } from '../lib/aisle'
import { cn } from '../lib/utils'
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const keyOf = (name: string) => name.trim().toLowerCase()

// Makes a new basket (no basketId) or changes one: a name, and the items picked from the family's
// everyday items (tap to pick, tap again to drop) or typed in.
export function BasketEditor({ basketId }: { basketId?: string }) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [commonItems, setCommonItems] = useState<{ name: string; aisle: Aisle }[]>([])
  const [name, setName] = useState('')
  // Picked items by lowercase name, in the order they were picked
  const [picked, setPicked] = useState<Map<string, string>>(new Map())
  const [other, setOther] = useState('')
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        const [common, basket] = await Promise.all([
          fetch('/api/common-items'),
          basketId ? fetch(`/api/baskets/${basketId}`) : Promise.resolve(null),
        ])
        if (common.ok) setCommonItems((await common.json()).items || [])
        if (basket) {
          if (basket.ok) {
            const data = (await basket.json()).basket as { name: string; items: string[] }
            setName(data.name)
            setPicked(new Map(data.items.map(item => [keyOf(item), item])))
          } else {
            setMissing(true)
          }
        }
      } catch (error) {
        console.error('Error loading basket:', error)
        toast('Kunne ikke hente kurven', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.user.familyId, basketId])

  const toggle = (item: string) =>
    setPicked(prev => {
      const next = new Map(prev)
      if (next.has(keyOf(item))) next.delete(keyOf(item))
      else next.set(keyOf(item), item)
      return next
    })

  const addOther = () => {
    const item = other.replace(/\s+/g, ' ').trim()
    if (!item) return
    if (picked.has(keyOf(item))) toast(`«${item}» er allerede med`, 'error')
    else setPicked(prev => new Map(prev).set(keyOf(item), item))
    setOther('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(basketId ? `/api/baskets/${basketId}` : '/api/baskets', {
        method: basketId ? 'PUT' : 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name, items: Array.from(picked.values()) }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        toast(basketId ? 'Kurven er lagret' : `Kurven «${data.basket.name}» er laget`)
        navigate({ to: '/' })
        return
      }
      toast(data.error || 'Kunne ikke lagre kurven', 'error')
    } catch (error) {
      console.error('Error saving basket:', error)
      toast('Kunne ikke lagre kurven', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!basketId) return
    try {
      const response = await fetch(`/api/baskets/${basketId}`, { method: 'DELETE' })
      if (response.ok) {
        toast('Kurven er slettet')
        navigate({ to: '/' })
      } else {
        toast('Kunne ikke slette kurven', 'error')
      }
    } catch (error) {
      console.error('Error deleting basket:', error)
      toast('Kunne ikke slette kurven', 'error')
    }
  }

  if (isPending || loading) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (missing) {
    return (
      <div className="max-w-md space-y-3">
        <p>Fant ikke kurven.</p>
        <Button asChild variant="outline">
          <Link to="/">Til handlelisten</Link>
        </Button>
      </div>
    )
  }

  const commonKeys = new Set(commonItems.map(item => keyOf(item.name)))
  const others = Array.from(picked.values()).filter(item => !commonKeys.has(keyOf(item)))
  const count = picked.size

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til handlelisten</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{basketId ? 'Rediger kurv' : 'Ny kurv'}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Velg det du kjøper igjen og igjen, så legger du alt i handlelisten med ett trykk.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="basket-name">Navn</Label>
        <Input id="basket-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="F.eks. Ukeshandel" maxLength={60} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Velg varer</h2>
        {commonItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Ingen vanlige varer ennå. Skriv inn varene nedenfor.</p>
        )}
        {AISLE_ORDER.map(aisle => {
          const group = commonItems.filter(item => item.aisle === aisle)
          if (group.length === 0) return null
          return (
            <div key={aisle} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{AISLE_LABELS[aisle]}</h3>
              <div className="flex flex-wrap gap-2">
                {group.map(item => {
                  const selected = picked.has(keyOf(item.name))
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggle(item.name)}
                      className={cn(
                        'flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                    >
                      {selected && <Check className="h-4 w-4" />}
                      {item.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Noe annet?</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addOther()
          }}
        >
          <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="F.eks. kattemat" aria-label="Annen vare" maxLength={100} />
          <Button type="submit" variant="outline" disabled={!other.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Legg til
          </Button>
        </form>
        {others.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {others.map(item => (
              <li key={item} className="flex min-h-10 items-center gap-1 rounded-full border border-primary bg-primary pl-3 pr-1 text-sm text-primary-foreground">
                {item}
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fjern {item}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {basketId && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-1 h-4 w-4" />
                Ja, slett kurven
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Avbryt
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Slett kurven
            </Button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 pt-3 sticky-bottom-bar">
        <Button className="h-12 w-full text-base" disabled={saving || count === 0 || !name.trim()} onClick={handleSave}>
          {saving ? 'Lagrer ...' : `Lagre kurven (${count} ${count === 1 ? 'vare' : 'varer'})`}
        </Button>
      </div>
    </div>
  )
}
