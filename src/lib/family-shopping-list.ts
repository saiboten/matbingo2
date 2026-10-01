import { prisma } from './prisma'
import { aisleOptions, aisleRank, guessAisle, isBuiltInAisle, type Aisle } from './aisle'
import { isFamilyAisle, listFamilyAisles } from './family-aisles'
import { ingredientKey, resolveAisles } from './ingredients'
import { buildShoppingItems } from './shopping-list'
import { EXTRA_SOURCE, MAX_EXTRA_NAME_LENGTH } from './shopping-extras'
import { dateKey, mondayOf, osloToday } from './utils'

// An error that is safe to show the user, with the HTTP status the API route should answer with
export class ShoppingListError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

type Db = Pick<typeof prisma, 'shoppingList' | 'shoppingListItem' | 'mealPlan' | 'ingredient' | 'familyAisle'>

interface Row {
  id: string
  name: string
  sources: string[]
  checked: boolean
  checkedAt: Date | null
  mealDate: Date | null
}

const MAX_IDS = 100
export const MAX_QUANTITY = 99

// The family's one list, made the first time it is needed
export async function getFamilyList(familyId: string, userId: string, db: Db = prisma) {
  return db.shoppingList.upsert({
    where: { familyId },
    create: { familyId, createdById: userId },
    update: {},
    include: { items: true }
  })
}

const rowKey = (mealDate: Date, name: string) => `${dateKey(mealDate)}|${ingredientKey(name)}`

// Puts the ingredients of every dinner from today on the list, one row per ingredient and dinner, so
// an ingredient comes back when a new dinner needs it. Unchecked rows for past dinners, or for
// dinners that were changed or removed, are taken off; checked rows stay as a record of what was bought.
export async function syncRecipeItems(familyId: string, listId: string, items: Row[], today: Date, db: Db = prisma) {
  const plans = await db.mealPlan.findMany({
    where: { familyId, date: { gte: today }, recipeId: { not: null } },
    include: { recipe: { select: { name: true, ingredients: true } } }
  })

  const wanted = new Map<string, { name: string; sources: string[]; mealDate: Date }>()
  for (const plan of plans) {
    if (!plan.recipe) continue
    for (const item of buildShoppingItems([plan.recipe])) {
      wanted.set(rowKey(plan.date, item.name), { ...item, mealDate: plan.date })
    }
  }

  const seen = new Set<string>()
  const stale: string[] = []
  const renamed: { id: string; sources: string[] }[] = []
  for (const item of items) {
    if (!item.mealDate) continue
    const key = rowKey(item.mealDate, item.name)
    const want = wanted.get(key)
    if (seen.has(key) || (!item.checked && (item.mealDate < today || !want))) {
      stale.push(item.id)
      continue
    }
    seen.add(key)
    if (want && want.sources.join() !== item.sources.join()) renamed.push({ id: item.id, sources: want.sources })
  }

  const missing = Array.from(wanted.entries()).filter(([key]) => !seen.has(key)).map(([, item]) => item)

  if (stale.length > 0) await db.shoppingListItem.deleteMany({ where: { id: { in: stale } } })
  for (const { id, sources } of renamed) await db.shoppingListItem.update({ where: { id }, data: { sources } })
  if (missing.length > 0) {
    const aisles = await resolveAisles(familyId, missing.map(item => item.name), {}, db)
    await db.shoppingListItem.createMany({
      data: missing.map(item => ({
        shoppingListId: listId,
        name: item.name,
        sources: item.sources,
        mealDate: item.mealDate,
        aisle: aisles.get(ingredientKey(item.name)) ?? guessAisle(item.name)
      }))
    })
  }
}

// The list as the family sees it: everything not yet bought, plus what was checked off this week
export async function readFamilyList(familyId: string, userId: string, db: Db = prisma, now: Date = new Date()) {
  const list = await getFamilyList(familyId, userId, db)
  const today = osloToday(now)
  const monday = mondayOf(today)

  // Items checked before the check time was recorded count as checked now
  await db.shoppingListItem.updateMany({ where: { shoppingListId: list.id, checked: true, checkedAt: null }, data: { checkedAt: now } })
  // Checked off before this week: no longer shown, so no longer kept
  await db.shoppingListItem.deleteMany({ where: { shoppingListId: list.id, checked: true, checkedAt: { lt: monday } } })

  const current = list.items.filter(item => !item.checked || (item.checkedAt ?? now) >= monday)
  await syncRecipeItems(familyId, list.id, current, today, db)

  const items = await db.shoppingListItem.findMany({ where: { shoppingListId: list.id } })
  const options = aisleOptions(items.some(item => !isBuiltInAisle(item.aisle)) ? await listFamilyAisles(familyId, db) : [])
  items.sort((a, b) => aisleRank(a.aisle, options) - aisleRank(b.aisle, options) || a.name.localeCompare(b.name, 'nb'))
  return { ...list, items }
}

// Adds an item by hand. One already added by hand gets one more instead of a second row; one that was
// checked off is put back on the list (unchecked). An ingredient that is only there for a dinner gets
// a row by hand next to it, so one more is bought. A name the family has a shelf for uses that shelf;
// for a new name the `aisle` given is used (else a guess), and the name is remembered with it.
export async function addListItem(familyId: string, userId: string, rawName: unknown, db: Db = prisma, aisleHint?: unknown) {
  const name = typeof rawName === 'string' ? rawName.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new ShoppingListError('Skriv inn navnet på varen', 400)
  if (name.length > MAX_EXTRA_NAME_LENGTH) throw new ShoppingListError('Navnet er for langt', 400)
  if (aisleHint !== undefined && !(await isFamilyAisle(familyId, aisleHint, db))) throw new ShoppingListError('Ugyldig hylle', 400)

  const list = await getFamilyList(familyId, userId, db)
  const same = list.items.filter(item => ingredientKey(item.name) === ingredientKey(name))
  const byHand = same.find(item => !item.mealDate && !item.checked) ?? same.find(item => !item.mealDate)
  if (byHand && !byHand.checked) {
    return db.shoppingListItem.update({ where: { id: byHand.id }, data: { quantity: Math.min(byHand.quantity + 1, MAX_QUANTITY) } })
  }
  // Bought earlier: back on the list, one of it
  const bought = byHand ?? (same.some(item => !item.checked) ? undefined : same[0])
  if (bought) {
    return db.shoppingListItem.update({ where: { id: bought.id }, data: { checked: false, checkedAt: null, quantity: 1 } })
  }

  const aisles = await resolveAisles(familyId, [name], { hints: aisleHint ? { [ingredientKey(name)]: aisleHint as Aisle } : {} }, db)
  const aisle: Aisle = aisles.get(ingredientKey(name)) ?? guessAisle(name)
  return db.shoppingListItem.create({
    data: { shoppingListId: list.id, name, aisle, sources: [EXTRA_SOURCE] }
  })
}

// Puts several items on the list at once (a basket), the same way addListItem does for one: what is
// already on the list is left alone, what was checked off comes back, the rest is added by hand.
// Returns how many were put on the list.
export async function addListItems(familyId: string, userId: string, names: string[], db: Db = prisma): Promise<number> {
  const list = await getFamilyList(familyId, userId, db)
  const wanted = new Map<string, string>()
  for (const name of names) wanted.set(ingredientKey(name), name)

  const uncheck: string[] = []
  const create: string[] = []
  for (const [key, name] of wanted) {
    const same = list.items.filter(item => ingredientKey(item.name) === key)
    if (same.some(item => !item.checked)) continue
    const existing = same.find(item => !item.mealDate) ?? same[0]
    if (existing) uncheck.push(existing.id)
    else create.push(name)
  }

  if (uncheck.length > 0) {
    await db.shoppingListItem.updateMany({ where: { id: { in: uncheck } }, data: { checked: false, checkedAt: null, quantity: 1 } })
  }
  if (create.length > 0) {
    const aisles = await resolveAisles(familyId, create, {}, db)
    await db.shoppingListItem.createMany({
      data: create.map(name => ({
        shoppingListId: list.id,
        name,
        sources: [EXTRA_SOURCE],
        aisle: aisles.get(ingredientKey(name)) ?? guessAisle(name)
      }))
    })
  }
  return uncheck.length + create.length
}

// Checks items off (or back on); a line on the list can stand for several rows
export async function setItemsChecked(familyId: string, itemIds: unknown, checked: unknown, db: Db = prisma, now: Date = new Date()) {
  const ids = Array.isArray(itemIds) ? itemIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_IDS) : []
  if (ids.length === 0 || typeof checked !== 'boolean') throw new ShoppingListError('Mangler påkrevde parametere', 400)

  const { count } = await db.shoppingListItem.updateMany({
    where: { id: { in: ids }, shoppingList: { familyId } },
    data: { checked, checkedAt: checked ? now : null }
  })
  if (count === 0) throw new ShoppingListError('Fant ikke varen', 404)
}

// Sets how many of an item added by hand to buy; recipe items follow the meal plan instead
export async function setItemQuantity(familyId: string, itemId: unknown, quantity: unknown, db: Db = prisma) {
  if (typeof itemId !== 'string' || !itemId) throw new ShoppingListError('Mangler påkrevde parametere', 400)
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new ShoppingListError('Ugyldig antall', 400)
  }
  const { count } = await db.shoppingListItem.updateMany({ where: { id: itemId, mealDate: null, shoppingList: { familyId } }, data: { quantity } })
  if (count === 0) throw new ShoppingListError('Fant ikke varen', 404)
}

// Takes an item added by hand off the list; recipe items follow the meal plan instead
export async function removeListItem(familyId: string, itemId: unknown, db: Db = prisma) {
  if (typeof itemId !== 'string' || !itemId) throw new ShoppingListError('Mangler påkrevde parametere', 400)
  const { count } = await db.shoppingListItem.deleteMany({ where: { id: itemId, mealDate: null, shoppingList: { familyId } } })
  if (count === 0) throw new ShoppingListError('Fant ikke varen', 404)
}
