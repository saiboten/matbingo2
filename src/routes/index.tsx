import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { formatDate, createImageUrl } from '../lib/utils'
import { Plus, Sparkles, Utensils } from 'lucide-react'
import type { MealPlan, Recipe, PlanOption } from '../types'

export const Route = createFileRoute('/')({
  component: HomePage,
  beforeLoad: async () => {
    // Check session on client side in component
  },
})

function HomePage() {
  const { data: session, isPending } = useSession()
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

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
      fetchRecipes()
    }
  }, [session])

  const fetchMealPlans = async () => {
    if (!session?.user.familyId) return
    
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 7)

    try {
      const response = await fetch(
        `/api/meal-plans?familyId=${session.user.familyId}&startDate=${today.toISOString()}&endDate=${endDate.toISOString()}`
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

  const handleAlgorithmSelect = async (date: Date) => {
    if (!session?.user.familyId) return

    try {
      const response = await fetch('/api/algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: session.user.familyId,
          date: date.toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.recipe) {
          handlePlanMeal(date, 'ALGORITHM', data.recipe.id)
        }
      }
    } catch (error) {
      console.error('Error running algorithm:', error)
    }
  }

  const getNext8Days = () => {
    const days = []
    const today = new Date()
    for (let i = 0; i < 8; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date)
    }
    return days
  }

  const getPlanForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return mealPlans.find(plan => new Date(plan.date).toDateString() === dateStr)
  }

  const getDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  // Prevent rendering if redirecting
  if (!isPending && (!session || !session.user.familyId)) {
    return null
  }

  const next8Days = getNext8Days()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meal Planner</h1>
        <p className="text-muted-foreground">
          {formatDate(new Date())} - {formatDate(next8Days[7])}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {next8Days.map((date, index) => {
          const plan = getPlanForDate(date)
          const isToday = index === 0
          const dayName = getDayName(date)

          return (
            <Card key={date.toISOString()} className={isToday ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {isToday ? 'Today' : dayName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </div>
                  {isToday && <Badge variant="default">Today</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {plan ? (
                  <div className="space-y-3">
                    {plan.option === 'OTHER' ? (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">{plan.otherText}</p>
                        <Badge variant="outline" className="mt-2">Custom</Badge>
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
                          {plan.recipe.type.toLowerCase()}
                        </Badge>
                        {plan.option === 'ALGORITHM' && (
                          <Badge variant="outline" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    ) : null}

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
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">No meal planned</p>
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
                        Add Recipe
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAlgorithmSelect(date)}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Auto Pick
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
                        Other
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
              Plan Meal for {selectedDate && formatDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4">
              <h3 className="font-medium">Choose a Recipe</h3>
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
                        {recipe.type.toLowerCase()} • Score: {recipe.score}     
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Or</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => selectedDate && handleAlgorithmSelect(selectedDate)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Let Algorithm Choose
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const otherText = prompt('What are you eating?')
                    if (otherText && selectedDate) {
                      handlePlanMeal(selectedDate, 'OTHER', undefined, otherText)
                    }
                  }}
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Something Else
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
