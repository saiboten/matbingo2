import { prisma } from './prisma'
import { guessAisle, type Aisle } from './aisle'

export function ingredientKey(name: string): string {
  return name.trim().toLowerCase()
}

type IngredientDb = Pick<typeof prisma, 'ingredient'>

// Returns the aisle for each ingredient name (keyed by ingredientKey). A name the family has chosen an
// aisle for uses that. Otherwise the aisle comes from `hints` (keyed by ingredientKey), else from the
// guess rules. New ones are saved as Ingredient rows unless `create` is false (used for previews).
export async function resolveAisles(
  familyId: string,
  names: string[],
  options: { hints?: Record<string, Aisle>; create?: boolean } = {},
  db: IngredientDb = prisma
): Promise<Map<string, Aisle>> {
  const { hints = {}, create = true } = options

  const unique = new Map<string, string>()
  for (const name of names) unique.set(ingredientKey(name), name.trim())

  const existing = await db.ingredient.findMany({
    where: { familyId, nameKey: { in: Array.from(unique.keys()) } }
  })
  const aisles = new Map<string, Aisle>(existing.map(i => [i.nameKey, i.aisle as Aisle]))

  const missing = Array.from(unique.entries()).filter(([key]) => !aisles.has(key))
  const created = missing.map(([nameKey, name]) => ({ familyId, name, nameKey, aisle: hints[nameKey] ?? guessAisle(name) }))

  if (create && created.length > 0) {
    await db.ingredient.createMany({ data: created, skipDuplicates: true })
  }
  for (const row of created) aisles.set(row.nameKey, row.aisle)

  return aisles
}
