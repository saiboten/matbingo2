import type { Aisle } from './aisle'
import { EXTRA_SOURCE, describeSources } from './shopping-extras'
import type { ShoppingListItem } from '../types'

// One line on the list. The same ingredient can be on the list for several dinners (one row each)
// and by hand; they are shown, and checked off, together.
export interface Line {
  key: string
  name: string
  aisle: Aisle
  checked: boolean
  // How many to buy: one for each dinner, plus however many were added by hand
  quantity: number
  rows: ShoppingListItem[]
}

export const nameKey = (name: string) => name.trim().toLowerCase()

const weekday = (day: string) =>
  new Intl.DateTimeFormat('nb-NO', { weekday: 'short', timeZone: 'UTC' }).format(new Date(day))

export function toLines(items: ShoppingListItem[]): Line[] {
  const lines = new Map<string, Line>()
  for (const item of items) {
    const key = `${nameKey(item.name)}|${item.checked}`
    const line = lines.get(key)
    const quantity = item.quantity ?? 1
    if (line) {
      line.rows.push(item)
      line.quantity += quantity
    } else {
      lines.set(key, { key, name: item.name, aisle: item.aisle, checked: item.checked, quantity, rows: [item] })
    }
  }
  return Array.from(lines.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

// "fra: Taco (tor.), Suppe (lør.)" for recipe rows, "Ekstra vare" for items added by hand
export function describeLine(line: Line): string {
  const sources = line.rows
    .slice()
    .sort((a, b) => (a.mealDate ?? '').localeCompare(b.mealDate ?? ''))
    .flatMap(row => (row.mealDate ? row.sources.map(source => `${source} (${weekday(row.mealDate!)})`) : [EXTRA_SOURCE]))
  return describeSources(Array.from(new Set(sources)))
}
