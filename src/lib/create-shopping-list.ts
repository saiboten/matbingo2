import { prisma } from './prisma'
import { aisleRank, type Aisle } from './aisle'
import { ingredientKey, resolveAisles } from './ingredients'
import { buildShoppingItems } from './shopping-list'
import { mergeExtras, normalizeExtras, type ExtraItem } from './shopping-extras'

// An error that is safe to show the user, with the HTTP status the API route should answer with
export class ShoppingListError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

type Db = Pick<typeof prisma, 'mealPlan' | 'ingredient' | 'shoppingList'>

export interface ListItem {
  name: string
  sources: string[]
  aisle: Aisle
}

const MAX_DAYS = 31

// Days come as calendar days ("2026-09-14") or full ISO dates; both mean that day at UTC midnight,
// the same convention as the meal plan. Anything else is ignored.
export function parseDays(input: unknown): Date[] {
  if (!Array.isArray(input)) return []

  const days = new Map<number, Date>()
  for (const value of input) {
    if (typeof value !== 'string') continue
    const day = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : new Date(NaN)
    if (!Number.isNaN(day.getTime())) days.set(day.getTime(), day)
    if (days.size === MAX_DAYS) break
  }
  return Array.from(days.values())
}

async function loadRecipeItems(familyId: string, days: Date[], db: Db) {
  if (days.length === 0) return { items: [], planDates: [] as Date[] }

  const plans = await db.mealPlan.findMany({
    where: { familyId, date: { in: days }, recipeId: { not: null } },
    include: { recipe: true },
    orderBy: { date: 'asc' }
  })

  const recipes = plans.flatMap(plan => (plan.recipe ? [plan.recipe] : []))
  return { items: buildShoppingItems(recipes), planDates: plans.map(plan => plan.date) }
}

function withAisles(
  items: { name: string; sources: string[] }[],
  aisles: Map<string, Aisle>
): ListItem[] {
  return items
    .map(item => ({ ...item, aisle: aisles.get(ingredientKey(item.name)) ?? ('OTHER' as Aisle) }))
    .sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.name.localeCompare(b.name))
}

// What the recipes on the chosen days contribute, for the "add more" step. Reads only.
export async function previewShoppingItems(
  input: { familyId: string; days: unknown },
  db: Db = prisma
): Promise<{ items: ListItem[]; recipeCount: number }> {
  const days = parseDays(input.days)
  const { items, planDates } = await loadRecipeItems(input.familyId, days, db)
  const aisles = await resolveAisles(input.familyId, items.map(item => item.name), { create: false }, db)
  return { items: withAisles(items, aisles), recipeCount: planDates.length }
}

// Makes the shopping list: the recipes' ingredients plus the extras, sorted by aisle
export async function createShoppingList(
  input: { familyId: string; userId: string; days: unknown; extras: unknown },
  db: Db = prisma
) {
  const days = parseDays(input.days)
  const extras: ExtraItem[] = normalizeExtras(input.extras)

  const { items: recipeItems, planDates } = await loadRecipeItems(input.familyId, days, db)
  const merged = mergeExtras(recipeItems, extras)

  if (merged.length === 0) {
    throw new ShoppingListError(
      days.length > 0 ? 'Ingen oppskrifter på de valgte dagene' : 'Velg dager eller legg til noen varer først',
      400
    )
  }

  const hints = Object.fromEntries(
    extras.filter(extra => extra.aisle).map(extra => [ingredientKey(extra.name), extra.aisle as Aisle])
  )
  const aisles = await resolveAisles(input.familyId, merged.map(item => item.name), { hints }, db)
  const items = withAisles(merged, aisles)

  return db.shoppingList.create({
    data: {
      familyId: input.familyId,
      createdById: input.userId,
      dates: planDates,
      items: { create: items }
    },
    include: { items: true }
  })
}
