import type { Day, DishType } from '../types'
import { formatIngredients, parseIngredients } from './ingredient-text'

// A family recipe as it is read from the database
export interface SourceRecipe {
  name: string
  description: string | null
  ingredients: string
  type: DishType
  score: number
  suitableDays: Day[]
  steps: { position: number; title: string | null; text: string }[]
  image?: { base64: string; mimeType: string } | null
}

export interface BlueprintDraft {
  name: string
  description: string | null
  ingredients: string
  type: DishType
  score: number
  suitableDays: Day[]
  steps: { position: number; title: string | null; text: string }[]
  image: { base64: string; mimeType: string } | null
}

export type ImportDecision = { ok: true; draft: BlueprintDraft } | { ok: false; reason: string }

const ALL_DAYS: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const MIN_DESCRIPTION_LENGTH = 25

// A family's private note ("Nam nam", "Todo", a bare link) doesn't belong in a shared library
export function cleanDescription(text: string | null | undefined): string | null {
  const description = (text ?? '').trim()
  if (description.length < MIN_DESCRIPTION_LENGTH) return null
  if (/^https?:\/\/\S+$/i.test(description)) return null
  if (/\b(todo|google it)\b/i.test(description)) return null
  return description.slice(0, 2000)
}

// Turns a family recipe into a blueprint draft, or says why it can't be one
export function recipeToBlueprintDraft(recipe: SourceRecipe): ImportDecision {
  const ingredients = formatIngredients(parseIngredients(recipe.ingredients))
  if (!ingredients) return { ok: false, reason: 'ingen ingredienser' }

  return {
    ok: true,
    draft: {
      name: recipe.name.trim(),
      description: cleanDescription(recipe.description),
      ingredients,
      type: recipe.type,
      // 0 means "never suggest" for the family that wrote it; a new family should start with a normal value
      score: recipe.score === 0 ? 5 : recipe.score,
      suitableDays: recipe.suitableDays.length ? recipe.suitableDays : ALL_DAYS,
      steps: [...recipe.steps]
        .sort((a, b) => a.position - b.position)
        .map((step, index) => ({ position: index + 1, title: step.title, text: step.text })),
      image: recipe.image ?? null,
    },
  }
}
