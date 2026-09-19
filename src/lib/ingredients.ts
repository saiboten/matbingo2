import { prisma } from './prisma'
import { guessAisle, type Aisle } from './aisle'

export function ingredientKey(name: string): string {
  return name.trim().toLowerCase()
}

// Returns the aisle for each ingredient name (keyed by ingredientKey), creating an Ingredient
// row with a guessed aisle for any the family hasn't seen before.
export async function resolveAisles(familyId: string, names: string[]): Promise<Map<string, Aisle>> {
  const unique = new Map<string, string>()
  for (const name of names) unique.set(ingredientKey(name), name.trim())

  const existing = await prisma.ingredient.findMany({
    where: { familyId, nameKey: { in: Array.from(unique.keys()) } }
  })
  const aisles = new Map<string, Aisle>(existing.map(i => [i.nameKey, i.aisle as Aisle]))

  const missing = Array.from(unique.entries()).filter(([key]) => !aisles.has(key))
  if (missing.length > 0) {
    const created = missing.map(([nameKey, name]) => ({ familyId, name, nameKey, aisle: guessAisle(name) }))
    await prisma.ingredient.createMany({ data: created, skipDuplicates: true })
    for (const row of created) aisles.set(row.nameKey, row.aisle)
  }

  return aisles
}
