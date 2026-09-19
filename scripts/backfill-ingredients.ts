import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { resolveAisles, ingredientKey } from '../src/lib/ingredients'

// One-off: create an Ingredient (with a guessed aisle) for every ingredient used in each family's
// recipes, and set the aisle on any existing shopping list items.
const families = await prisma.family.findMany({ select: { id: true } })
let created = 0

for (const { id: familyId } of families) {
  const recipes = await prisma.recipe.findMany({ where: { familyId }, select: { ingredients: true } })
  const names = recipes.flatMap(r => r.ingredients.split(',').map(n => n.trim()).filter(Boolean))
  if (names.length === 0) continue

  const before = await prisma.ingredient.count({ where: { familyId } })
  const aisles = await resolveAisles(familyId, names)
  created += (await prisma.ingredient.count({ where: { familyId } })) - before

  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingList: { familyId } },
    select: { id: true, name: true }
  })
  for (const item of items) {
    await prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { aisle: aisles.get(ingredientKey(item.name)) ?? 'OTHER' }
    })
  }
}

console.log(`${families.length} families, ${created} ingredients created`)
await prisma.$disconnect()
