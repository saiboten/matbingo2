import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { RecipeCombobox } from '../components/recipe-combobox'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { IngredientMultiSelect } from '../components/ingredient-multi-select'
import { formatDate, dateKey, osloToday } from '../lib/utils'
import { recipeImageUrl } from '../lib/recipe-image'
import { Plus, Sparkles, Utensils, Filter, Trash2, ChevronLeft, ChevronRight, Pencil, CookingPot, Loader2 } from 'lucide-react'
import type { MealPlan, Recipe, PlanOption, DishType } from '../types'
import { DISH_TYPE_OPTIONS, DISH_TYPE_LABELS, DISH_TYPE_COLORS } from '../types'

export const Route = createFileRoute('/meal-plan')({
  component: MealPlanPage,
  beforeLoad: async () => {
    // Check session on client side in component
  },
})

// Placeholder shown while the session and first week load; mirrors the real layout so nothing jumps.
function WeekSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Laster ukesmeny">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Ukesmeny</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <Skeleton className="h-[52px] w-full" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="mt-1 h-4 w-12" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Indexed by getUTCDay(): 0 = Sunday
const DAY_NAMES_FULL = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

// The seven days starting today, moved `weekOffset` weeks (UTC calendar days).
function getWeekDays(weekOffset: number): Date[] {
  const start = osloToday()
  start.setUTCDate(start.getUTCDate() + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    return d
  })
}

function MealPlanPage() {
  const { data: session, isPending } = useSession()
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [noSuggestionDate, setNoSuggestionDate] = useState<Date | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, Recipe>>({})
  const [suggestionLoading, setSuggestionLoading] = useState<Record<string, boolean>>({})
  const [declinedIds, setDeclinedIds] = useState<Record<string, string[]>>({})
  const [suggestionType, setSuggestionType] = useState<DishType | 'ALL'>('ALL')
  const [suggestionIngredients, setSuggestionIngredients] = useState<string[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([])
  const navigate = useNavigate()

  const weekDays = getWeekDays(weekOffset)
  const todayKey = dateKey(osloToday())

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (session?.user.familyId) {
      fetchMealPlans()
    }
  }, [session, weekOffset])

  useEffect(() => {
    if (session?.user.familyId) {
      fetchIngredients()
    }
  }, [session])

  const fetchMealPlans = async () => {
    if (!session?.user.familyId) return

    const startDate = weekDays[0]
    const endDate = weekDays[6]

    try {
      const response = await fetch(
        `/api/meal-plans?familyId=${session.user.familyId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      const data = await response.json()
      setMealPlans(data.mealPlans || [])
    } catch (error) {
      console.error('Error fetching meal plans:', error)
    } finally {
      setLoading(false)
    }
  }

  // The recipes are only needed for the "add recipe" dialog, so they are fetched when it is first opened
  const openPlanDialog = (date: Date) => {
    setSelectedDate(date)
    setDialogOpen(true)
    if (recipes.length === 0) fetchRecipes()
  }

  const fetchRecipes = async () => {
    if (!session?.user.familyId) return

    try {
      const response = await fetch(`/api/recipes?familyId=${session.user.familyId}`)
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  const fetchIngredients = async () => {
    if (!session?.user.familyId) return

    try {
      const response = await fetch(`/api/ingredients?familyId=${session.user.familyId}`)
      const data = await response.json()
      setAvailableIngredients(data.ingredients || [])
    } catch (error) {
      console.error('Error fetching ingredients:', error)
    }
  }

  const handlePlanMeal = async (date: Date, option: PlanOption, recipeId?: string, otherText?: string) => {
    if (!session?.user.familyId) return

    try {
      const response = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          option,
          recipeId,
          otherText,
          familyId: session.user.familyId,
          plannedById: session.user.id
        })
      })

      if (response.ok) {
        fetchMealPlans()
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Error planning meal:', error)
    }
  }

  const handleDeleteMealPlan = async (date: Date) => {
    if (!session?.user.familyId) return
    if (!confirm('Fjerne middagen for denne dagen?')) return

    try {
      const response = await fetch(
        `/api/meal-plans?familyId=${session.user.familyId}&date=${encodeURIComponent(date.toISOString())}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        fetchMealPlans()
      }
    } catch (error) {
      console.error('Error removing meal plan:', error)
    }
  }

  const fetchSuggestion = async (date: Date, excludeIds: string[]) => {
    if (!session?.user.familyId) return
    const key = dateKey(date)

    setSuggestionLoading(prev => ({ ...prev, [key]: true }))
    try {
      const response = await fetch('/api/algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: session.user.familyId,
          date: date.toISOString(),
          excludeRecipeIds: excludeIds,
          type: suggestionType !== 'ALL' ? suggestionType : undefined,
          ingredients: suggestionIngredients.length > 0 ? suggestionIngredients : undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.recipe) {
          setSuggestions(prev => ({ ...prev, [key]: data.recipe }))
        }
      } else {
        setSuggestions(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
        if (response.status === 404) {
          setNoSuggestionDate(date)
        }
      }
    } catch (error) {
      console.error('Error running algorithm:', error)
    } finally {
      setSuggestionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleAutoPick = (date: Date) => {
    const key = dateKey(date)
    setDeclinedIds(prev => ({ ...prev, [key]: [] }))
    fetchSuggestion(date, [])
  }

  const handleAcceptSuggestion = async (date: Date) => {
    const key = dateKey(date)
    const suggestion = suggestions[key]
    if (!suggestion) return

    await handlePlanMeal(date, 'ALGORITHM', suggestion.id)
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDeclinedIds(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleDeclineSuggestion = (date: Date) => {
    const key = dateKey(date)
    const suggestion = suggestions[key]
    const nextDeclined = suggestion
      ? [...(declinedIds[key] || []), suggestion.id]
      : declinedIds[key] || []
    setDeclinedIds(prev => ({ ...prev, [key]: nextDeclined }))
    fetchSuggestion(date, nextDeclined)
  }

  const handleCancelSuggestion = (date: Date) => {
    const key = dateKey(date)
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDeclinedIds(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const getPlanForDate = (date: Date) => {
    const key = dateKey(date)
    return mealPlans.find(plan => dateKey(new Date(plan.date)) === key)
  }

  if (isPending || loading) {
    return <WeekSkeleton />
  }

  // Prevent rendering if redirecting
  if (!isPending && (!session || !session.user.familyId)) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Ukesmeny</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Forrige uke</span>
          </Button>
          <p className="text-muted-foreground text-sm sm:text-base sm:w-44 text-center">
            {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
          </p>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Neste uke</span>
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              I dag
            </Button>
          )}
        </div>
      </div>

      <p className="-mt-3 text-sm text-muted-foreground">
        Ingrediensene til middagene fra i dag og fremover legges automatisk på{' '}
        <Link to="/" className="text-primary hover:underline">
          handlelisten
        </Link>
        .
      </p>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mr-1">
          <Filter className="h-4 w-4" />
          Filtre for forslag
        </div>
        <Select value={suggestionType} onValueChange={(value) => setSuggestionType(value as DishType | 'ALL')}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Alle typer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle typer</SelectItem>
            {DISH_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IngredientMultiSelect
          options={availableIngredients}
          selected={suggestionIngredients}
          onChange={setSuggestionIngredients}
          placeholder="Ingredienser ..."
          className="w-full sm:w-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {weekDays.map(date => {
          const plan = getPlanForDate(date)
          const key = dateKey(date)
          const isToday = key === todayKey
          const dayName = DAY_NAMES_FULL[date.getUTCDay()]

          return (
            <Card key={key} className={isToday ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <CardTitle className="flex flex-wrap items-baseline gap-x-2 text-lg">
                    {dayName}
                    <span className="text-sm font-normal text-muted-foreground">
                      {date.getUTCDate()}. {date.toLocaleDateString('nb-NO', { month: 'short', timeZone: 'UTC' })}
                    </span>
                  </CardTitle>
                  {isToday && <Badge variant="default" className="whitespace-nowrap">I dag</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {plan ? (
                  <div className="space-y-3">
                    {plan.option === 'OTHER' ? (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">{plan.otherText}</p>
                        <Badge variant="outline" className="mt-2">Egendefinert</Badge>
                      </div>
                    ) : plan.recipe ? (
                      <div className="space-y-2">
                        {recipeImageUrl(plan.recipe) && (
                          <img
                            src={recipeImageUrl(plan.recipe)!}
                            alt={plan.recipe.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        )}
                        <h3 className="font-medium">{plan.recipe.name}</h3>
                        <Badge
                          variant="secondary"
                          className={DISH_TYPE_COLORS[plan.recipe.type]}
                        >
                          {DISH_TYPE_LABELS[plan.recipe.type]}
                        </Badge>
                        {plan.option === 'ALGORITHM' && (
                          <Badge variant="outline" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Forslag
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {plan.recipe.ingredients
                            .split(',')
                            .map(ingredient => ingredient.trim())
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <Button asChild variant="secondary" size="sm" className="w-full">
                          <Link to="/recipes/$recipeId/cook" params={{ recipeId: plan.recipe.id }}>
                            <CookingPot className="h-4 w-4 mr-1" />
                            Lag maten
                          </Link>
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openPlanDialog(date)}
                      >
                        Endre
                      </Button>
                      {plan.recipe && (
                        <Button asChild variant="outline" size="icon">
                          <Link
                            to="/recipes/$recipeId"
                            params={{ recipeId: plan.recipe.id }}
                            search={{ edit: true }}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Rediger oppskrift</span>
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteMealPlan(date)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Fjern</span>
                      </Button>
                    </div>
                  </div>
                ) : suggestions[key] ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Forslag</p>
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      {recipeImageUrl(suggestions[key]) && (
                        <img
                          src={recipeImageUrl(suggestions[key])!}
                          alt={suggestions[key].name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{suggestions[key].name}</h3>
                      </div>
                      <Badge
                        variant="secondary"
                        className={DISH_TYPE_COLORS[suggestions[key].type]}
                      >
                        {DISH_TYPE_LABELS[suggestions[key].type]}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAcceptSuggestion(date)}
                    >
                      Godta
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={suggestionLoading[key]}
                        onClick={() => handleDeclineSuggestion(date)}
                      >
                        {suggestionLoading[key] && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {suggestionLoading[key] ? 'Finner ...' : 'Prøv et annet'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCancelSuggestion(date)}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ingen middag planlagt</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={suggestionLoading[key]}
                        onClick={() => handleAutoPick(date)}
                      >
                        {suggestionLoading[key] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        {suggestionLoading[key] ? 'Finner ...' : 'Foreslå middag'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPlanDialog(date)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Velg middag
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Meal Selection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Planlegg middag for {selectedDate && formatDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4">
              <h3 className="font-medium">Velg en oppskrift</h3>
              <RecipeCombobox recipes={recipes} onSelect={(recipe) => handlePlanMeal(selectedDate!, 'MANUAL', recipe.id)} />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Eller</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (selectedDate) {
                      handleAutoPick(selectedDate)
                      setDialogOpen(false)
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  La appen foreslå
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const otherText = prompt('Hva skal dere spise?')
                    if (otherText && selectedDate) {
                      handlePlanMeal(selectedDate, 'OTHER', undefined, otherText)
                    }
                  }}
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Noe annet
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shown when «Foreslå middag» finds nothing with the current filters */}
      <Dialog open={noSuggestionDate !== null} onOpenChange={(open) => !open && setNoSuggestionDate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fant ingen passende oppskrift</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Ingen oppskrifter passer {noSuggestionDate ? `for ${formatDate(noSuggestionDate)}` : 'denne dagen'} med filtrene du har valgt.
            </p>
            <p className="text-muted-foreground">
              Oppskrifter i dvale, oppskrifter som ikke passer denne ukedagen og forslag du allerede har avslått regnes ikke med.
              Prøv å fjerne et filter.
            </p>
          </div>
          <Button className="w-full sm:w-auto sm:self-end" onClick={() => setNoSuggestionDate(null)}>
            Lukk
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
