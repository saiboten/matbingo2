// Shown on the list where recipe items say "fra: <recipes>"
export const EXTRA_SOURCE = 'Ekstra'

export const MAX_EXTRA_NAME_LENGTH = 100

// The small grey line under a list item. An item that is both added by hand and needed by a recipe
// just names the recipes.
export function describeSources(sources: string[]): string {
  const recipes = sources.filter(source => source !== EXTRA_SOURCE)
  if (recipes.length > 0) return `fra: ${recipes.join(', ')}`
  return sources.length > 0 ? 'Ekstra vare' : ''
}
