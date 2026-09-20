import { AISLE_ORDER, type Aisle } from './aisle'

// Extra items added to a shopping list besides what the recipes need: common things and free text
export interface ExtraItem {
  name: string
  // Where it is found, when known (common items); otherwise the family's choice or a guess is used
  aisle?: Aisle
}

export const MAX_EXTRAS = 100
export const MAX_EXTRA_NAME_LENGTH = 100

// Shown on the list where recipe items say "fra: <recipes>"
export const EXTRA_SOURCE = 'Ekstra'

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRA_NAME_LENGTH)
}

// Tidies what the client sent: trims, drops empty names and repeats (ignoring case), caps the count,
// and keeps an aisle only if it is a real one.
export function normalizeExtras(input: unknown): ExtraItem[] {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const extras: ExtraItem[] = []
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue
    const { name, aisle } = entry as { name?: unknown; aisle?: unknown }
    const clean = typeof name === 'string' ? cleanName(name) : ''
    if (!clean || seen.has(clean.toLowerCase())) continue
    seen.add(clean.toLowerCase())

    extras.push({ name: clean, ...(AISLE_ORDER.includes(aisle as Aisle) && { aisle: aisle as Aisle }) })
    if (extras.length === MAX_EXTRAS) break
  }
  return extras
}

// Adds the extras to the recipe items. One that is already on the list (ignoring case) is left out,
// so nothing is bought twice.
export function mergeExtras<T extends { name: string; sources: string[] }>(
  items: T[],
  extras: ExtraItem[]
): (T | { name: string; sources: string[] })[] {
  const present = new Set(items.map(item => item.name.toLowerCase()))
  const added = extras
    .filter(extra => !present.has(extra.name.toLowerCase()))
    .map(extra => ({ name: extra.name, sources: [EXTRA_SOURCE] }))
  return [...items, ...added]
}

// The small grey line under a list item
export function describeSources(sources: string[]): string {
  if (sources.length === 0) return ''
  if (sources.length === 1 && sources[0] === EXTRA_SOURCE) return 'Ekstra vare'
  return `fra: ${sources.join(', ')}`
}
