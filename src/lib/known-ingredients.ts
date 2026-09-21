import { prisma } from './prisma'
import { type Aisle } from './aisle'
import { ingredientKey, resolveAisles } from './ingredients'

type Db = Pick<typeof prisma, 'ingredient' | 'recipe'>

export interface KnownIngredient {
  name: string
  aisle: Aisle
}

// Every ingredient the family knows a shelf for: the ones saved earlier (shopping lists, everyday
// items) and the ones in its recipes, the latter with their guessed shelf. Nothing is written.
export async function listKnownIngredients(familyId: string, db: Db = prisma): Promise<KnownIngredient[]> {
  const [rows, recipes] = await Promise.all([
    db.ingredient.findMany({ where: { familyId }, select: { name: true, nameKey: true } }),
    db.recipe.findMany({ where: { familyId }, select: { ingredients: true } })
  ])

  const names = new Map<string, string>()
  for (const row of rows) names.set(row.nameKey, row.name)
  for (const recipe of recipes) {
    for (const raw of recipe.ingredients.split(',')) {
      const name = raw.trim()
      if (name && !names.has(ingredientKey(name))) names.set(ingredientKey(name), name)
    }
  }

  const aisles = await resolveAisles(familyId, Array.from(names.values()), { create: false }, db)
  return Array.from(names.entries())
    .map(([key, name]) => ({ name, aisle: aisles.get(key)! }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}
