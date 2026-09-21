import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { recipeImageUrl } from '../../lib/recipe-image'
import { Plus, Search, ChefHat, Moon, Library } from 'lucide-react'
import type { Recipe, DishType } from '../../types'
import { DISH_TYPE_OPTIONS, DISH_TYPE_COLORS, DISH_TYPE_LABELS } from '../../types'

export const Route = createFileRoute('/recipes/')({
  component: RecipesPage,
})

function RecipesPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<DishType | 'ALL'>('ALL')

  useEffect(() => {
    if (session?.user.familyId) {
      fetchRecipes()
    }
  }, [session])

  const fetchRecipes = async () => {
    if (!session?.user.familyId) return

    try {
      let url = `/api/recipes?familyId=${session.user.familyId}`
      if (selectedType !== 'ALL') {
        url += `&type=${selectedType}`
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRecipes()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedType])

  if (loading) {
    return <div className="flex justify-center p-8">Laster oppskrifter ...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Oppskrifter</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Familiens egne oppskrifter. Trenger du flere, finner du ferdige i biblioteket.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/recipes/library">
              <Library className="h-4 w-4 mr-2" />
              Legg til ferdige oppskrifter
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/recipes/overview">
              <Moon className="h-4 w-4 mr-2" />
              Sett i dvale
            </Link>
          </Button>
          <Link to="/recipes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Legg til egen oppskrift
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk i oppskrifter ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as DishType | 'ALL')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrer på type" />
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
      </div>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Ingen oppskrifter ennå</h3>
          <p className="text-muted-foreground mb-4">
            Legg til din første oppskrift for å begynne å planlegge middager
          </p>
          <Link to="/recipes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Legg til egen oppskrift
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} to="/recipes/$recipeId" params={{ recipeId: recipe.id }}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  {recipe.image ? (
                    <img
                      src={recipeImageUrl(recipe)!}
                      loading="lazy"
                      decoding="async"
                      alt={recipe.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <ChefHat className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={DISH_TYPE_COLORS[recipe.type]}>
                      {DISH_TYPE_LABELS[recipe.type]}
                    </Badge>
                    <Badge variant="secondary">
                      Poeng: {recipe.score}
                    </Badge>
                    {recipe.hibernating && (
                      <Badge variant="outline">
                        <Moon className="h-3 w-3 mr-1" />
                        I dvale
                      </Badge>
                    )}
                  </div>
                  {recipe.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
