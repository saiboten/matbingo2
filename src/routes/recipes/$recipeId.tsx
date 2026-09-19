import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { IngredientListInput } from '../../components/ingredient-list-input'
import { RecipeStepsEditor } from '../../components/recipe-steps-editor'
import { parseIngredients, formatIngredients } from '../../lib/ingredient-text'
import type { StepDraft } from '../../lib/recipe-steps'
import { Slider } from '../../components/ui/slider'
import { Checkbox } from '../../components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { fileToBase64, validateImage, createImageUrl, formatDate } from '../../lib/utils'
import { DISH_TYPE_OPTIONS, DAYS, DISH_TYPE_COLORS, DISH_TYPE_LABELS, DAY_LABELS } from '../../types'
import type { Recipe, Day, DishType } from '../../types'
import { ArrowLeft, Upload, ChefHat, ExternalLink, Trash2, Save, CookingPot } from 'lucide-react'

export const Route = createFileRoute('/recipes/$recipeId')({
  component: RecipeDetailPage,
  // /recipes/<id>?edit=true opens the page straight in edit mode
  validateSearch: (search: Record<string, unknown>): { edit?: true } =>
    search.edit === true || search.edit === 'true' ? { edit: true } : {},
})

function RecipeDetailPage() {
  const { recipeId } = useParams({ from: '/recipes/$recipeId' })
  const navigate = useNavigate()
  const { edit } = Route.useSearch()
  const isEditing = edit === true
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  // Edit mode lives in the URL so it can be linked to; leaving it replaces the history entry
  const setIsEditing = (value: boolean) =>
    navigate({
      to: '/recipes/$recipeId',
      params: { recipeId },
      search: value ? { edit: true } : {},
      replace: !value
    })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null)
  
  // Edit form state
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [ingredientOptions, setIngredientOptions] = useState<string[]>([])
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [description, setDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [score, setScore] = useState(5)
  const [type, setType] = useState<DishType>('OTHER')
  const [suitableDays, setSuitableDays] = useState<Day[]>([])

  useEffect(() => {
    if (recipeId) {
      fetchRecipe()
    }
  }, [recipeId])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipe/${recipeId}`)
      const data = await response.json()
      if (data.recipe) {
        setRecipe(data.recipe)
        // Initialize edit form
        setName(data.recipe.name)
        setIngredients(parseIngredients(data.recipe.ingredients))
        fetch(`/api/ingredients?familyId=${data.recipe.familyId}`)
          .then(response => response.json())
          .then(options => setIngredientOptions(options.ingredients || []))
          .catch(error => console.error('Error fetching ingredients:', error))
        setDescription(data.recipe.description || '')
        setExternalUrl(data.recipe.externalUrl || '')
        setScore(data.recipe.score)
        setType(data.recipe.type)
        setSuitableDays(data.recipe.suitableDays)
        setSteps((data.recipe.steps ?? []).map((step: { title?: string | null; text: string }) => ({ title: step.title ?? '', text: step.text })))
        if (data.recipe.image) {
          setImagePreview(createImageUrl(data.recipe.image))
        }
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateImage(file)) {
      alert('Velg en bildefil under 2 MB')
      return
    }

    try {
      const data = await fileToBase64(file)
      setImageData(data)
      setImagePreview(`data:${data.mimeType};base64,${data.base64}`)
    } catch (error) {
      console.error('Error processing image:', error)
    }
  }

  const toggleDay = (day: Day) => {
    setSuitableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/recipe/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ingredients: formatIngredients(ingredients),
          description: description || undefined,
          externalUrl: externalUrl || undefined,
          score,
          type,
          suitableDays,
          steps,
          image: imageData || undefined
        })
      })

      if (response.ok) {
        setIsEditing(false)
        fetchRecipe()
      } else {
        alert('Kunne ikke oppdatere oppskriften')
      }
    } catch (error) {
      console.error('Error updating recipe:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Er du sikker på at du vil slette denne oppskriften?')) return

    try {
      const response = await fetch(`/api/recipe/${recipeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        navigate({ to: '/recipes' })
      } else {
        alert('Kunne ikke slette oppskriften')
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
  }

  if (!recipe) {
    return <div className="text-center p-8">Fant ikke oppskriften</div>
  }

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Rediger oppskrift</h1>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Bilde</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Forhåndsvisning" className="h-32 w-32 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2"
                      onClick={() => { setImagePreview(null); setImageData(null); }}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center">
                    <ChefHat className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                  <Label htmlFor="image-upload">
                    <Button type="button" variant="outline" asChild>
                      <span><Upload className="h-4 w-4 mr-2" /> Bytt bilde</span>
                    </Button>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle>Grunnleggende informasjon</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Navn på oppskrift</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type rett</Label>
                <Select value={type} onValueChange={(value) => setType(value as DishType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISH_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hyppighet: {score}</Label>
                <Slider value={score} onChange={setScore} min={0} max={10} step={1} />
              </div>
            </CardContent>
          </Card>

          {/* Days */}
          <Card>
            <CardHeader><CardTitle>Passende dager</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {DAYS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={day.value}
                      checked={suitableDays.includes(day.value)}
                      onCheckedChange={() => toggleDay(day.value)}
                    />
                    <Label htmlFor={day.value} className="text-sm font-normal">{day.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Detaljer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ingredienser</Label>
                <IngredientListInput value={ingredients} onChange={setIngredients} options={ingredientOptions} />
              </div>
              <div className="space-y-2">
                <Label>Beskrivelse</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Lenke til oppskrift</Label>
                <Input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fremgangsmåte</CardTitle></CardHeader>
            <CardContent>
              <RecipeStepsEditor steps={steps} onChange={setSteps} />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={saving || ingredients.length === 0} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Lagrer ...' : 'Lagre endringer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Avbryt</Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate({ to: '/recipes' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{recipe.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Rediger
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {recipe.image && (
        <img 
          src={createImageUrl(recipe.image)} 
          alt={recipe.name}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Badge className={DISH_TYPE_COLORS[recipe.type]}>
          {DISH_TYPE_LABELS[recipe.type]}
        </Badge>
        <Badge variant="secondary">Poeng: {recipe.score}</Badge>
      </div>

      <Button asChild size="lg" className="mb-6 w-full">
        <Link to="/recipes/$recipeId/cook" params={{ recipeId }}>
          <CookingPot className="h-5 w-5 mr-2" />
          Lag maten
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Passende dager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {recipe.suitableDays.map((day) => (
              <Badge key={day} variant="outline">{DAY_LABELS[day]}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ingredienser</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {parseIngredients(recipe.ingredients).map(item => (
              <li key={item} className="py-2">{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {recipe.steps && recipe.steps.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fremgangsmåte</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {recipe.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    {step.title && <p className="font-semibold">{step.title}</p>}
                    <p className="whitespace-pre-wrap">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {recipe.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Beskrivelse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{recipe.description}</p>
          </CardContent>
        </Card>
      )}

      {recipe.externalUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Ekstern lenke</CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={recipe.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Se hele oppskriften
            </a>
          </CardContent>
        </Card>
      )}

      {recipe.eatenLogs && recipe.eatenLogs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Nylig spist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recipe.eatenLogs.map((log) => (
                <div key={log.id} className="text-sm text-muted-foreground">
                  {formatDate(new Date(log.date))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
