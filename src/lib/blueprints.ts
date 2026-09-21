import type { Day, DishType } from '../types'

// A ready-made recipe in the shared library. Families copy one into their own recipes; the copy is an
// ordinary recipe, so editing it never changes the blueprint.
export interface Blueprint {
  id: string
  name: string
  description: string | null
  // Comma-separated, like a recipe's own ingredients
  ingredients: string
  type: DishType
  // How often the recipe is suggested by default (0-10)
  score: number
  suitableDays: Day[]
  position: number
  updatedAt: string
  hasImage: boolean
  // Link to the photo (Vercel Blob), when it has been moved there
  imageUrl: string | null
  steps: { position: number; title: string | null; text: string }[]
}

const ALL_DAYS: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

// What a blueprint row from the database looks like (with its steps and a marker for a photo)
interface BlueprintRow {
  id: string
  name: string
  description: string | null
  ingredients: string
  type: DishType
  score: number
  suitableDays: Day[]
  position: number
  updatedAt: Date
  steps: { position: number; title: string | null; text: string }[]
  imageUrl?: string | null
  image?: { id: string } | null
}

export function toBlueprint(row: BlueprintRow): Blueprint {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients,
    type: row.type,
    score: row.score,
    suitableDays: row.suitableDays,
    position: row.position,
    updatedAt: row.updatedAt.toISOString(),
    hasImage: Boolean(row.imageUrl || row.image),
    imageUrl: row.imageUrl ?? null,
    steps: row.steps.map(({ position, title, text }) => ({ position, title, text })),
  }
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

// A copy is an ordinary recipe, so a blueprint counts as added when the family has a recipe with the
// same name. Returns blueprint id -> id of that recipe.
export function matchAddedBlueprints(
  blueprints: { id: string; name: string }[],
  recipes: { id: string; name: string }[]
): Record<string, string> {
  const byName = new Map(recipes.map(recipe => [nameKey(recipe.name), recipe.id]))
  const added: Record<string, string> = {}
  for (const blueprint of blueprints) {
    const recipeId = byName.get(nameKey(blueprint.name))
    if (recipeId) added[blueprint.id] = recipeId
  }
  return added
}

// The fields of the new recipe that a blueprint is copied into
export function blueprintRecipeData(blueprint: Blueprint) {
  return {
    name: blueprint.name,
    type: blueprint.type,
    score: blueprint.score,
    ingredients: blueprint.ingredients,
    description: blueprint.description,
    suitableDays: blueprint.suitableDays.length ? blueprint.suitableDays : ALL_DAYS,
    steps: blueprint.steps.map(({ title, text }, index) => ({ position: index + 1, title, text })),
  }
}

// URL of a blueprint's photo, or null: the link to Blob, or for a photo not moved yet the old endpoint
// (`updatedAt` is in that URL so a changed photo gets a new address).
export function blueprintImageUrl(blueprint: { id: string; updatedAt: string; hasImage: boolean; imageUrl?: string | null }): string | null {
  if (blueprint.imageUrl) return blueprint.imageUrl
  if (!blueprint.hasImage) return null
  return `/api/blueprint-image/${blueprint.id}?v=${new Date(blueprint.updatedAt).getTime()}`
}
