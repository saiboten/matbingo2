// Recipe ingredients are stored as one comma-separated string. These helpers convert to and from
// a list and keep new entries consistent with the ingredients the family already uses.

export function parseIngredients(text: string): string[] {
  return text.split(',').map(item => item.trim()).filter(Boolean)
}

export function formatIngredients(items: string[]): string {
  return items.join(', ')
}

// Trim, collapse whitespace, and drop commas (they are the separator in the stored string).
export function normalizeIngredient(text: string): string {
  return text.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
}

// The existing ingredient with the same name, ignoring case, if there is one.
export function findExisting(text: string, options: string[]): string | undefined {
  const key = normalizeIngredient(text).toLowerCase()
  return options.find(option => option.toLowerCase() === key)
}

// Adds `text` to the list unless it is empty or already there. A name matching an existing
// ingredient uses that spelling; anything else is added as a new ingredient as typed.
export function addIngredient(list: string[], text: string, options: string[]): string[] {
  const normalized = normalizeIngredient(text)
  if (!normalized) return list

  const name = findExisting(normalized, options) ?? normalized
  if (list.some(item => item.toLowerCase() === name.toLowerCase())) return list
  return [...list, name]
}
