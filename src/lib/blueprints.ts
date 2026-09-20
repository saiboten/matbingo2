import { BLUEPRINTS, type Blueprint } from '../data/blueprint-recipes'
import type { Day } from '../types'

export { BLUEPRINTS }
export type { Blueprint }

const ALL_DAYS: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export function findBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINTS.find(blueprint => blueprint.id === id)
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

// A copy is an ordinary recipe, so a blueprint counts as added when the family has a recipe with the
// same name. Returns blueprint id -> id of that recipe.
export function matchAddedBlueprints(
  blueprints: Blueprint[],
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
    suitableDays: blueprint.suitableDays ?? ALL_DAYS,
    steps: blueprint.steps.map(([title, text], index) => ({ position: index + 1, title, text })),
  }
}
