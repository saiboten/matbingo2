import { prisma } from './prisma'
import { ingredientKey } from './ingredients'
import { addListItems } from './family-shopping-list'
import { MAX_EXTRA_NAME_LENGTH } from './shopping-extras'

type Db = Pick<typeof prisma, 'basket' | 'shoppingList' | 'shoppingListItem' | 'mealPlan' | 'ingredient' | 'familyAisle'>

// An error that is safe to show the user, with the HTTP status the API route should answer with
export class BasketError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export interface FamilyBasket {
  id: string
  name: string
  items: string[]
}

export const MAX_BASKET_NAME_LENGTH = 60
export const MAX_BASKET_ITEMS = 100

const include = { items: { orderBy: { name: 'asc' as const } } }

function toBasket(row: { id: string; name: string; items: { name: string }[] }): FamilyBasket {
  return { id: row.id, name: row.name, items: row.items.map(item => item.name) }
}

// Tidies what the client sent: a name, and item names without blanks or repeats (ignoring case)
export function parseBasketInput(input: { name?: unknown; items?: unknown }): { name: string; items: string[] } {
  const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new BasketError('Gi kurven et navn', 400)
  if (name.length > MAX_BASKET_NAME_LENGTH) throw new BasketError('Navnet er for langt', 400)

  const seen = new Set<string>()
  const items: string[] = []
  for (const value of Array.isArray(input.items) ? input.items : []) {
    const item = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRA_NAME_LENGTH) : ''
    if (!item || seen.has(ingredientKey(item))) continue
    seen.add(ingredientKey(item))
    items.push(item)
  }
  if (items.length === 0) throw new BasketError('Velg minst én vare', 400)
  if (items.length > MAX_BASKET_ITEMS) throw new BasketError(`En kurv kan ha opptil ${MAX_BASKET_ITEMS} varer`, 400)
  return { name, items }
}

export async function listBaskets(familyId: string, db: Db = prisma): Promise<FamilyBasket[]> {
  const rows = await db.basket.findMany({ where: { familyId }, include, orderBy: { name: 'asc' } })
  return rows.map(toBasket)
}

export async function getBasket(familyId: string, id: string, db: Db = prisma): Promise<FamilyBasket> {
  const row = await db.basket.findFirst({ where: { id, familyId }, include })
  if (!row) throw new BasketError('Fant ikke kurven', 404)
  return toBasket(row)
}

export async function createBasket(familyId: string, input: { name?: unknown; items?: unknown }, db: Db = prisma): Promise<FamilyBasket> {
  const { name, items } = parseBasketInput(input)
  const row = await db.basket.create({
    data: { familyId, name, items: { create: items.map(item => ({ name: item })) } },
    include
  })
  return toBasket(row)
}

// Replaces the name and the items
export async function updateBasket(familyId: string, id: string, input: { name?: unknown; items?: unknown }, db: Db = prisma): Promise<FamilyBasket> {
  const { name, items } = parseBasketInput(input)
  await getBasket(familyId, id, db)
  const row = await db.basket.update({
    where: { id },
    data: { name, items: { deleteMany: {}, create: items.map(item => ({ name: item })) } },
    include
  })
  return toBasket(row)
}

export async function deleteBasket(familyId: string, id: string, db: Db = prisma): Promise<void> {
  const { count } = await db.basket.deleteMany({ where: { id, familyId } })
  if (count === 0) throw new BasketError('Fant ikke kurven', 404)
}

// Puts everything in the basket on the family's shopping list; returns how many were added
export async function addBasketToList(familyId: string, userId: string, id: string, db: Db = prisma): Promise<number> {
  const basket = await getBasket(familyId, id, db)
  return addListItems(familyId, userId, basket.items, db)
}
