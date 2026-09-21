import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { formatDate, cn } from '../../lib/utils'
import { DISH_TYPE_COLORS, DISH_TYPE_LABELS } from '../../types'
import type { DishType } from '../../types'
import { ArrowLeft, Moon, Search, Sun } from 'lucide-react'

interface OverviewRecipe {
  id: string
  name: string
  type: DishType
  score: number
  hibernating: boolean
  eatenCount: number
  lastEaten: string | null
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'HIBERNATING'
type SortKey = 'name' | 'lastEaten' | 'eatenCount'

export const Route = createFileRoute('/recipes/overview')({
  component: RecipeOverviewPage,
})

function RecipeOverviewPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<OverviewRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('name')

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (!session?.user.familyId) return

    const fetchRecipes = async () => {
      try {
        const response = await fetch(`/api/recipe-overview?familyId=${session.user.familyId}`)
        const data = await response.json()
        setRecipes(data.recipes || [])
      } catch (error) {
        console.error('Error fetching recipes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [session])

  const handleToggle = async (id: string, hibernating: boolean) => {
    if (!session?.user.familyId) return

    const setHibernating = (value: boolean) =>
      setRecipes(prev => prev.map(r => (r.id === id ? { ...r, hibernating: value } : r)))

    // Optimistic update, rolled back if the save fails
    setHibernating(hibernating)
    try {
      const response = await fetch('/api/recipe-overview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: session.user.familyId, id, hibernating })
      })
      if (!response.ok) setHibernating(!hibernating)
    } catch (error) {
      console.error('Error updating recipe:', error)
      setHibernating(!hibernating)
    }
  }

  if (isPending || loading) {
    return (
      <div className="space-y-4 max-w-3xl" aria-busy="true" aria-label="Laster oppskrifter">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const hibernatingCount = recipes.filter(r => r.hibernating).length
  const needle = query.trim().toLowerCase()

  const visible = recipes
    .filter(r => (status === 'ALL' ? true : status === 'HIBERNATING' ? r.hibernating : !r.hibernating))
    .filter(r => !needle || r.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === 'eatenCount') return b.eatenCount - a.eatenCount || a.name.localeCompare(b.name, 'nb')
      if (sort === 'lastEaten') {
        // Longest ago first; never eaten comes before everything
        const at = a.lastEaten ? new Date(a.lastEaten).getTime() : -Infinity
        const bt = b.lastEaten ? new Date(b.lastEaten).getTime() : -Infinity
        return at - bt || a.name.localeCompare(b.name, 'nb')
      }
      return a.name.localeCompare(b.name, 'nb')
    })

  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'ALL', label: 'Alle', count: recipes.length },
    { value: 'ACTIVE', label: 'Aktive', count: recipes.length - hibernatingCount },
    { value: 'HIBERNATING', label: 'I dvale', count: hibernatingCount },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til oppskrifter</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Sett i dvale</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Se hvor ofte hver oppskrift er spist. Oppskrifter i dvale foreslås ikke av «Foreslå middag». Du kan fortsatt legge dem inn selv.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {filters.map(filter => (
          <Button
            key={filter.value}
            variant={status === filter.value ? 'default' : 'outline'}
            className="h-10"
            onClick={() => setStatus(filter.value)}
          >
            {filter.label} ({filter.count})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk i oppskrifter ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-40 shrink-0" aria-label="Sorter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Navn</SelectItem>
            <SelectItem value="lastEaten">Sist spist</SelectItem>
            <SelectItem value="eatenCount">Oftest spist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">
          {recipes.length === 0
            ? 'Ingen oppskrifter ennå.'
            : status === 'HIBERNATING' && !needle
              ? 'Ingen oppskrifter er i dvale.'
              : 'Fant ingen oppskrifter.'}
        </p>
      ) : (
        <ul className="divide-y">
          {visible.map(recipe => (
            <li key={recipe.id} className="flex items-center justify-between gap-3 py-3">
              <div className={cn('min-w-0', recipe.hibernating && 'opacity-60')}>
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: recipe.id }}
                  className="break-words font-medium hover:underline"
                >
                  {recipe.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Badge className={cn('text-xs', DISH_TYPE_COLORS[recipe.type])}>
                    {DISH_TYPE_LABELS[recipe.type]}
                  </Badge>
                  <span>
                    {recipe.lastEaten
                      ? `Sist spist ${formatDate(new Date(recipe.lastEaten))}`
                      : 'Aldri spist'}
                  </span>
                  {recipe.eatenCount > 0 && <span>· {recipe.eatenCount} ganger</span>}
                </div>
              </div>
              <Button
                variant={recipe.hibernating ? 'default' : 'outline'}
                className="h-10 w-28 shrink-0 px-2 sm:w-36"
                onClick={() => handleToggle(recipe.id, !recipe.hibernating)}
              >
                {recipe.hibernating ? (
                  <Sun className="mr-1 h-4 w-4 shrink-0" />
                ) : (
                  <Moon className="mr-1 h-4 w-4 shrink-0" />
                )}
                {recipe.hibernating ? 'Vekk opp' : 'Legg i dvale'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
