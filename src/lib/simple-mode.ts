import { prisma } from './prisma'
import { effectiveAdminId } from './family'
import { guessAisle, type Aisle } from './aisle'
import { ingredientKey, resolveAisles } from './ingredients'
import { EXTRA_SOURCE, MAX_EXTRA_NAME_LENGTH } from './shopping-extras'

type Db = Pick<typeof prisma, 'family' | 'shoppingList' | 'shoppingListItem' | 'ingredient'>

export class SimpleModeError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// Everyone except the family owner gets the simple mode: just the latest shopping list
export async function isSimpleUser(userId: string, familyId: string, db: Pick<Db, 'family'> = prisma): Promise<boolean> {
  const family = await db.family.findUnique({
    where: { id: familyId },
    select: { adminId: true, members: { select: { id: true, createdAt: true } } }
  })
  if (!family) return true
  return effectiveAdminId(family.adminId, family.members) !== userId
}

export async function latestShoppingList(familyId: string, db: Pick<Db, 'shoppingList'> = prisma) {
  return db.shoppingList.findFirst({
    where: { familyId },
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  })
}

// Adds an item to a list of the family. An item that is already there is put back on the list
// (unchecked) instead of being added twice.
export async function addListItem(familyId: string, listId: string, rawName: unknown, db: Db = prisma) {
  const name = typeof rawName === 'string' ? rawName.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new SimpleModeError('Skriv inn navnet på varen', 400)
  if (name.length > MAX_EXTRA_NAME_LENGTH) throw new SimpleModeError('Navnet er for langt', 400)

  const list = await db.shoppingList.findFirst({ where: { id: listId, familyId }, include: { items: true } })
  if (!list) throw new SimpleModeError('Fant ikke handlelisten', 404)

  const existing = list.items.find(item => ingredientKey(item.name) === ingredientKey(name))
  if (existing) {
    return db.shoppingListItem.update({ where: { id: existing.id }, data: { checked: false } })
  }

  const aisles = await resolveAisles(familyId, [name], {}, db)
  const aisle: Aisle = aisles.get(ingredientKey(name)) ?? guessAisle(name)
  return db.shoppingListItem.create({
    data: { shoppingListId: listId, name, aisle, sources: [EXTRA_SOURCE] }
  })
}
