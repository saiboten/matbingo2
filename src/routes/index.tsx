import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { IngredientMultiSelect } from '../components/ingredient-multi-select'
import { formatDate, createImageUrl, dateKey, utcMidnight } from '../lib/utils'
import { Plus, Sparkles, Utensils, Filter, Trash2, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import type { MealPlan, Recipe, PlanOption, DishType } from '../types'
import { DISH_TYPE_OPTIONS, DISH_TYPE_LABELS } from '../types'

export const Route = createFileRoute('/')({
  component: HomePage,
  beforeLoad: async () => {
    // Check session on client side in component
  },
})

const DAY_NAMES = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

// Monday of the week `weekOffset` weeks from the current week (UTC calendar days).
function getWeekStart(weekOffset: number): Date {
  const now = new Date()
  const today = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  today.setUTCDate(today.getUTCDate() + diffToMonday + weekOffset * 7)
  return today
}

function getWeekDays(weekOffset: number): Date[] {
  const monday = getWeekStart(weekOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d
  })
}

function HomePage() {
  const { data: session, isPending } = useSession()
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, Recipe>>({})
  const [suggestionLoading, setSuggestionLoading] = useState<Record<string, boolean>>({})
  const [declinedIds, setDeclinedIds] = useState<Record<string, string[]>>({})
  const [suggestionType, setSuggestionType] = useState<DishType | 'ALL'>('ALL')
  const [suggestionIngredients, setSuggestionIngredients] = useState<string[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([])
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [creatingList, setCreatingList] = useState(false)
  const navigate = useNavigate()

  const weekDays = getWeekDays(weekOffset)
  const todayKey = dateKey(new Date())

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
      fetchRecipes()
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
          alert('Fant ingen passende oppskrift for denne dagen med gjeldende filtre')
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

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedDates(new Set())
  }

  const toggleSelectedDate = (key: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreateShoppingList = async () => {
    if (!session?.user.familyId || selectedDates.size === 0) return

    // dateKeys are UTC calendar days (YYYY-MM-DD), same convention as the meal plan dates
    const dates = Array.from(selectedDates).map(key => {
      const [y, m, d] = key.split('-').map(Number)
      return utcMidnight(y, m - 1, d).toISOString()
    })

    setCreatingList(true)
    try {
      const response = await fetch('/api/shopping-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: session.user.familyId,
          createdById: session.user.id,
          dates
        })
      })

      if (response.ok) {
        const data = await response.json()
        exitSelectMode()
        navigate({ to: '/shopping-lists/$listId', params: { listId: data.shoppingList.id } })
      } else {
        alert('Kunne ikke lage handlelisten')
      }
    } catch (error) {
      console.error('Error creating shopping list:', error)
    } finally {
      setCreatingList(false)
    }
  }

  const getPlanForDate = (date: Date) => {
    const key = dateKey(date)
    return mealPlans.find(plan => dateKey(new Date(plan.date)) === key)
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
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
          {!selectMode && (
            <Button variant="secondary" size="sm" onClick={() => setSelectMode(true)}>
              <ShoppingCart className="h-4 w-4 mr-1" />
              Lag handleliste
            </Button>
          )}
        </div>
      </div>

      {selectMode && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 bg-muted border rounded-lg shadow-sm">
          <p className="text-sm">
            Velg dagene du vil handle til
            <span className="text-muted-foreground"> ({selectedDates.size} valgt)</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exitSelectMode} disabled={creatingList}>
              Avbryt
            </Button>
            <Button
              size="sm"
              onClick={handleCreateShoppingList}
              disabled={selectedDates.size === 0 || creatingList}
            >
              {creatingList ? 'Lager ...' : 'Ferdig'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-1 text-sm text-muted-foreground mr-1">
          <Filter className="h-4 w-4" />
          Filtre for forslag
        </div>
        <Select value={suggestionType} onValueChange={(value) => setSuggestionType(value as DishType | 'ALL')}>
          <SelectTrigger className="w-36">
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
          className="w-72"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {weekDays.map((date, index) => {
          const plan = getPlanForDate(date)
          const key = dateKey(date)
          const isToday = key === todayKey
          const dayName = DAY_NAMES[index]
          const selectable = !!plan?.recipe
          const selected = selectedDates.has(key)

          return (
            <Card
              key={key}
              className={`${isToday ? 'border-primary' : ''} ${selected ? 'ring-2 ring-primary' : ''} ${
                selectMode && selectable ? 'cursor-pointer' : ''
              }`}
              onClick={selectMode && selectable ? () => toggleSelectedDate(key) : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {selectMode && (
                    <Checkbox
                      checked={selected}
                      disabled={!selectable}
                      onCheckedChange={() => toggleSelectedDate(key)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Velg ${dayName}`}
                      className="mr-3"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {isToday ? 'I dag' : dayName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {date.getUTCDate()} {date.toLocaleDateString('nb-NO', { month: 'short', timeZone: 'UTC' })}
                    </p>
                  </div>
                  {isToday && <Badge variant="default">I dag</Badge>}
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
                        {plan.recipe.image && (
                          <img
                            src={createImageUrl(plan.recipe.image)}
                            alt={plan.recipe.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        )}
                        <h3 className="font-medium">{plan.recipe.name}</h3>
                        <Badge
                          variant="secondary"
                          className={
                            plan.recipe.type === 'MEAT' ? 'bg-red-100 text-red-800' :
                            plan.recipe.type === 'FISH' ? 'bg-blue-100 text-blue-800' :
                            plan.recipe.type === 'VEGAN' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {DISH_TYPE_LABELS[plan.recipe.type]}
                        </Badge>
                        {plan.option === 'ALGORITHM' && (
                          <Badge variant="outline" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Forslag
                          </Badge>
                        )}
                      </div>
                    ) : null}

                    {!selectMode && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedDate(date)
                            setDialogOpen(true)
                          }}
                        >
                          Endre
                        </Button>
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
                    )}
                  </div>
                ) : selectMode ? (
                  <p className="text-sm text-muted-foreground">Ingen oppskrift å handle til</p>
                ) : suggestions[key] ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Forslag</p>
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{suggestions[key].name}</h3>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          suggestions[key].type === 'MEAT' ? 'bg-red-100 text-red-800' :
                          suggestions[key].type === 'FISH' ? 'bg-blue-100 text-blue-800' :
                          suggestions[key].type === 'VEGAN' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }
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
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(date)
                          setDialogOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Legg til oppskrift
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={suggestionLoading[key]}
                        onClick={() => handleAutoPick(date)}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        {suggestionLoading[key] ? 'Finner ...' : 'Foreslå middag'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(date)
                          // Open dialog with "Other" option pre-selected
                        }}
                      >
                        <Utensils className="h-4 w-4 mr-1" />
                        Annet
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
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handlePlanMeal(selectedDate!, 'MANUAL', recipe.id)}
                  >
                    {recipe.image ? (
                      <img
                        src={createImageUrl(recipe.image)}
                        alt={recipe.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                        <Utensils className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{recipe.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {DISH_TYPE_LABELS[recipe.type]} • Poeng: {recipe.score}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  )
}
