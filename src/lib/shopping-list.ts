export interface ShoppingItemDraft {
  name: string
  sources: string[]
}

// Aggregates comma-separated recipe ingredient strings into deduped items
// (case-insensitive), remembering which recipes each item came from.
export function buildShoppingItems(
  recipes: { name: string; ingredients: string }[]
): ShoppingItemDraft[] {
  const items = new Map<string, { name: string; sources: Set<string> }>()

  for (const recipe of recipes) {
    for (const raw of recipe.ingredients.split(',')) {
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      const existing = items.get(key)
      if (existing) {
        existing.sources.add(recipe.name)
      } else {
        items.set(key, { name, sources: new Set([recipe.name]) })
      }
    }
  }

  return Array.from(items.values())
    .map(({ name, sources }) => ({ name, sources: Array.from(sources) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
