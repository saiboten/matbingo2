import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Slider } from '../../components/ui/slider'
import { Checkbox } from '../../components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { fileToBase64, validateImage } from '../../lib/utils'
import { DISH_TYPE_OPTIONS, DAYS } from '../../types'
import type { Day, DishType } from '../../types'
import { ArrowLeft, Upload, ChefHat } from 'lucide-react'

export const Route = createFileRoute('/recipes/new')({
  component: NewRecipePage,
})

function NewRecipePage() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [description, setDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [score, setScore] = useState(5)
  const [type, setType] = useState<DishType>('OTHER')
  const [suitableDays, setSuitableDays] = useState<Day[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!validateImage(file)) {
      alert('Please select an image file under 2MB')
      return
    }

    try {
      const data = await fileToBase64(file)
      setImageData(data)
      setImagePreview(`data:${data.mimeType};base64,${data.base64}`)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Error processing image')
    }
  }

  const toggleDay = (day: Day) => {
    setSuitableDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user.familyId) return

    setLoading(true)
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ingredients,
          description: description || undefined,
          externalUrl: externalUrl || undefined,
          score,
          type,
          suitableDays,
          familyId: session.user.familyId,
          createdById: session.user.id,
          image: imageData || undefined
        })
      })

      if (response.ok) {
        navigate({ to: '/recipes' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create recipe')
      }
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Error creating recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate({ to: '/recipes' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Add New Recipe</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="h-32 w-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2"
                    onClick={() => {
                      setImagePreview(null)
                      setImageData(null)
                    }}
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
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <Label htmlFor="image-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </span>
                  </Button>
                </Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Max 2MB. Optional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spaghetti Carbonara"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Dish Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as DishType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
              <Label htmlFor="score">
                Frequency Score: {score} 
                <span className="text-muted-foreground text-sm ml-2">
                  ({score === 0 ? 'Never' : score === 10 ? 'Very often' : 'Occasionally'})
                </span>
              </Label>
              <Slider
                value={score}
                onChange={setScore}
                min={0}
                max={10}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                0 = Never suggest automatically, 10 = Suggest very often
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suitable Days */}
        <Card>
          <CardHeader>
            <CardTitle>Suitable Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {DAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={suitableDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label htmlFor={day.value} className="text-sm font-normal">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients *</Label>
              <Textarea
                id="ingredients"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="List the ingredients needed..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description or cooking notes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalUrl">External Recipe URL</Label>
              <Input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/recipe"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={loading || !name || !ingredients || suitableDays.length === 0}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Create Recipe'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate({ to: '/recipes' })}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
