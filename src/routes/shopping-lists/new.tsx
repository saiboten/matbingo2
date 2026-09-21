import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toast'
import { AISLE_LABELS, AISLE_ORDER, type Aisle } from '../../lib/aisle'
import { normalizeExtras } from '../../lib/shopping-extras'
import { cn } from '../../lib/utils'
import { ArrowLeft, Check, Pencil, Plus, X } from 'lucide-react'

export const Route = createFileRoute('/shopping-lists/new')({
  // The chosen days travel in the address (?dates=2026-09-14,2026-09-15), so a reload keeps them
  validateSearch: (search: Record<string, unknown>): { dates: string } => ({
    dates: typeof search.dates === 'string' ? search.dates : '',
  }),
  component: NewShoppingListPage,
})

function NewShoppingListPage() {
  const { dates } = Route.useSearch()
  return <NewShoppingListView dates={dates} />
}

interface PreviewItem {
  name: string
  aisle: Aisle
  sources: string[]
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

// The step between choosing days and the shopping list: see what the recipes need, add everyday
// things and anything unusual, then make the list.
export function NewShoppingListView({ dates }: { dates: string }) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const dayKeys = dates.split(',').filter(key => DAY_KEY.test(key))

  const [recipeItems, setRecipeItems] = useState<PreviewItem[]>([])
  const [recipeCount, setRecipeCount] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  // Common items are picked from the family's own list; own items are free text
  const [commonItems, setCommonItems] = useState<{ name: string; aisle: Aisle }[]>([])
  const [commonLoading, setCommonLoading] = useState(true)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  const fetchPreview = async () => {
    // Nothing to look up without days; the page just explains what to do
    if (dayKeys.length === 0) {
      setPreviewLoading(false)
      return
    }
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      const response = await fetch(`/api/shopping-lists/preview?dates=${dayKeys.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        setRecipeItems(data.items || [])
        setRecipeCount(data.recipeCount || 0)
      } else {
        setPreviewError(`feil ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching recipe items:', error)
      setPreviewError('ingen kontakt med serveren')
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user.familyId) fetchPreview()
  }, [session, dates])

  useEffect(() => {
    if (!session?.user.familyId) return
    const loadCommon = async () => {
      try {
        const response = await fetch('/api/common-items')
        if (response.ok) setCommonItems((await response.json()).items || [])
      } catch (error) {
        console.error('Error fetching common items:', error)
      } finally {
        setCommonLoading(false)
      }
    }
    loadCommon()
  }, [session])

  const inRecipes = new Set(recipeItems.map(item => item.name.toLowerCase()))
  const onList = (name: string) =>
    inRecipes.has(name.toLowerCase()) ||
    picked.has(name.toLowerCase()) ||
    custom.some(item => item.toLowerCase() === name.toLowerCase())

  const togglePicked = (name: string) =>
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(name.toLowerCase())) next.delete(name.toLowerCase())
      else next.add(name.toLowerCase())
      return next
    })

  const addCustom = () => {
    const name = customInput.replace(/\s+/g, ' ').trim()
    if (!name) return
    if (onList(name)) {
      toast(`«${name}» er allerede med`, 'error')
    } else {
      setCustom(prev => [...prev, name])
    }
    setCustomInput('')
  }

  const total = recipeItems.length + picked.size + custom.length

  const handleCreate = async () => {
    const extras = normalizeExtras([
      ...commonItems.filter(item => picked.has(item.name.toLowerCase())),
      ...custom.map(name => ({ name })),
    ])

    setCreating(true)
    try {
      const response = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: dayKeys, extras }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        navigate({ to: '/shopping-lists/$listId', params: { listId: data.shoppingList.id } })
        return
      }
      toast(data.error || 'Kunne ikke lage handlelisten', 'error')
    } catch (error) {
      console.error('Error creating shopping list:', error)
      toast('Kunne ikke lage handlelisten', 'error')
    }
    setCreating(false)
  }

  if (isPending) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (dayKeys.length === 0) {
    return (
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-bold">Ingen dager valgt</h1>
        <p className="text-muted-foreground">Velg dagene du vil handle til på ukesmenyen først.</p>
        <Button asChild variant="outline">
          <Link to="/">Til ukesmenyen</Link>
        </Button>
      </div>
    )
  }

  const recipeByAisle = AISLE_ORDER.map(aisle => ({
    aisle,
    names: recipeItems.filter(item => item.aisle === aisle).map(item => item.name),
  })).filter(group => group.names.length > 0)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til ukesmenyen</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Trenger du noe mer?</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Legg til det du vanligvis trenger, før du lager handlelisten.
          </p>
        </div>
      </div>

      {previewError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
          <span>Kunne ikke hente varene fra oppskriftene ({previewError}). Du kan likevel legge til ekstra varer.</span>
          <Button variant="outline" size="sm" onClick={fetchPreview}>
            Prøv igjen
          </Button>
        </div>
      )}

      <section>
        <details className="rounded-lg border">
          <summary className="cursor-pointer select-none p-3 font-medium">
            Fra oppskriftene
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {previewLoading
                ? 'Henter ...'
                : `${recipeItems.length} varer fra ${recipeCount} ${recipeCount === 1 ? 'oppskrift' : 'oppskrifter'}`}
            </span>
          </summary>
          <div className="divide-y border-t">
            {recipeByAisle.map(group => (
              <div key={group.aisle} className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {AISLE_LABELS[group.aisle]}
                </p>
                <p className="text-sm">{group.names.join(', ')}</p>
              </div>
            ))}
            {!previewLoading && recipeByAisle.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Ingen oppskrifter på de valgte dagene.</p>
            )}
          </div>
        </details>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Vanlige varer</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/shopping-lists/common-items">
              <Pencil className="mr-1 h-4 w-4" />
              Rediger listen
            </Link>
          </Button>
        </div>
        {!commonLoading && commonItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Ingen vanlige varer i listen din ennå. Legg til noen med «Rediger listen».</p>
        )}
        {AISLE_ORDER.map(aisle => {
          const group = commonItems.filter(item => item.aisle === aisle)
          if (group.length === 0) return null
          return (
            <div key={aisle} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{AISLE_LABELS[aisle]}</h3>
              <div className="flex flex-wrap gap-2">
                {group.map(item => {
                  const fromRecipe = inRecipes.has(item.name.toLowerCase())
                  const selected = picked.has(item.name.toLowerCase())
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-pressed={selected || fromRecipe}
                      disabled={fromRecipe}
                      title={fromRecipe ? 'Kommer allerede med fra en oppskrift' : undefined}
                      onClick={() => togglePicked(item.name)}
                      className={cn(
                        'flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm transition-colors',
                        selected && 'border-primary bg-primary text-primary-foreground',
                        fromRecipe && 'cursor-default bg-muted text-muted-foreground',
                        !selected && !fromRecipe && 'hover:bg-accent'
                      )}
                    >
                      {(selected || fromRecipe) && <Check className="h-4 w-4" />}
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
            addCustom()
          }}
        >
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="F.eks. batterier, blomster ..."
            aria-label="Annen vare"
            maxLength={100}
          />
          <Button type="submit" variant="outline" disabled={!customInput.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Legg til
          </Button>
        </form>
        {custom.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {custom.map(name => (
              <li key={name} className="flex min-h-10 items-center gap-1 rounded-full border border-primary bg-primary pl-3 pr-1 text-sm text-primary-foreground">
                {name}
                <button
                  type="button"
                  onClick={() => setCustom(prev => prev.filter(item => item !== name))}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fjern {name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 py-3">
        <Button className="h-12 w-full text-base" disabled={creating || total === 0} onClick={handleCreate}>
          {creating ? 'Lager handlelisten ...' : `Lag handleliste (${total} ${total === 1 ? 'vare' : 'varer'})`}
        </Button>
      </div>
    </div>
  )
}
