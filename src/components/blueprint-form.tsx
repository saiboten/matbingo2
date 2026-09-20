import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Slider } from './ui/slider'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { IngredientListInput } from './ingredient-list-input'
import { RecipeStepsEditor } from './recipe-steps-editor'
import { useToast } from './ui/toast'
import { fileToBase64, validateImage } from '../lib/utils'
import { formatIngredients, parseIngredients } from '../lib/ingredient-text'
import { blueprintImageUrl, type Blueprint } from '../lib/blueprints'
import type { StepDraft } from '../lib/recipe-steps'
import { DAYS, DISH_TYPE_OPTIONS } from '../types'
import type { Day, DishType } from '../types'
import { ChefHat, Save, Upload } from 'lucide-react'

export interface BlueprintPayload {
  name: string
  description: string
  ingredients: string
  type: DishType
  score: number
  suitableDays: Day[]
  steps: StepDraft[]
  image?: { base64: string; mimeType: string }
}

interface BlueprintFormProps {
  initial?: Blueprint | null
  // Ingredient names to suggest while typing
  ingredientOptions: string[]
  saving: boolean
  submitLabel: string
  onSubmit: (payload: BlueprintPayload) => void
  onCancel: () => void
}

// The same fields as the normal recipe form, for a blueprint in the shared library
export function BlueprintForm({ initial, ingredientOptions, saving, submitLabel, onSubmit, onCancel }: BlueprintFormProps) {
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [ingredients, setIngredients] = useState<string[]>(parseIngredients(initial?.ingredients ?? ''))
  const [type, setType] = useState<DishType>(initial?.type ?? 'OTHER')
  const [score, setScore] = useState(initial?.score ?? 5)
  const [suitableDays, setSuitableDays] = useState<Day[]>(initial?.suitableDays ?? DAYS.map(day => day.value))
  const [steps, setSteps] = useState<StepDraft[]>(
    (initial?.steps ?? []).map(step => ({ title: step.title ?? '', text: step.text }))
  )
  const [imagePreview, setImagePreview] = useState<string | null>(initial ? blueprintImageUrl(initial) : null)
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null)

  const toggleDay = (day: Day) =>
    setSuitableDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]))

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateImage(file)) {
      toast('Velg en bildefil under 2 MB', 'error')
      return
    }

    try {
      const data = await fileToBase64(file)
      setImageData(data)
      setImagePreview(`data:${data.mimeType};base64,${data.base64}`)
    } catch (error) {
      console.error('Error processing image:', error)
      toast('Noe gikk galt under behandlingen av bildet', 'error')
    }
  }

  const canSave = name.trim() !== '' && ingredients.length > 0 && suitableDays.length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          name,
          description,
          ingredients: formatIngredients(ingredients),
          type,
          score,
          suitableDays,
          steps,
          ...(imageData && { image: imageData }),
        })
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Bilde</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Forhåndsvisning" className="h-32 w-32 object-cover rounded-lg" />
            ) : (
              <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center">
                <ChefHat className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div>
              <Input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="blueprint-image-upload" />
              <Label htmlFor="blueprint-image-upload">
                <Button type="button" variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? 'Bytt bilde' : 'Last opp bilde'}
                  </span>
                </Button>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blueprint-name">Navn på oppskrift *</Label>
            <Input id="blueprint-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Type rett *</Label>
            <Select value={type} onValueChange={(value) => setType(value as DishType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISH_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hyppighet: {score}</Label>
            <Slider value={score} onChange={setScore} min={0} max={10} step={1} />
            <p className="text-sm text-muted-foreground">
              Startverdien familier får når de legger til oppskriften. 0 = foreslås aldri automatisk.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passende dager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {DAYS.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`blueprint-day-${day.value}`}
                  checked={suitableDays.includes(day.value)}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <Label htmlFor={`blueprint-day-${day.value}`} className="text-sm font-normal">
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blueprint-ingredients">Ingredienser *</Label>
            <IngredientListInput
              id="blueprint-ingredients"
              value={ingredients}
              onChange={setIngredients}
              options={ingredientOptions}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blueprint-description">Beskrivelse</Label>
            <Textarea
              id="blueprint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivelse som vises i biblioteket ..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fremgangsmåte</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeStepsEditor steps={steps} onChange={setSteps} />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={saving || !canSave} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Lagrer ...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </form>
  )
}
