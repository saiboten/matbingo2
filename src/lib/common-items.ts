import { prisma } from './prisma'
import { COMMON_ITEMS } from '../data/common-items'
import { AISLE_ORDER, guessAisle, type Aisle } from './aisle'
import { ingredientKey } from './ingredients'
import { MAX_EXTRA_NAME_LENGTH } from './shopping-extras'

type Db = Pick<typeof prisma, 'ingredient' | 'family'>

export interface FamilyCommonItem {
  id: string
  name: string
  aisle: Aisle
}

export class CommonItemError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

const isAisle = (value: unknown): value is Aisle => AISLE_ORDER.includes(value as Aisle)

// A family's everyday items live on its Ingredient rows (common = true), so the aisle is the same one
// used on the ingredients page and on shopping lists. The first time a family asks, it is given the
// default set; after that the list is entirely its own, so a removed item stays removed.
export async function ensureCommonItems(familyId: string, db: Db = prisma): Promise<void> {
  // Only the request that flips the flag seeds, so two at once cannot both do it
  const claimed = await db.family.updateMany({
    where: { id: familyId, commonItemsSeeded: false },
    data: { commonItemsSeeded: true }
  })
  if (claimed.count === 0) return

  const keys = COMMON_ITEMS.map(item => ingredientKey(item.name))
  const existing = await db.ingredient.findMany({ where: { familyId, nameKey: { in: keys } }, select: { nameKey: true } })
  const have = new Set(existing.map(row => row.nameKey))

  // An ingredient the family already knows keeps the aisle it chose; only new ones get the default
  await db.ingredient.updateMany({ where: { familyId, nameKey: { in: Array.from(have) } }, data: { common: true } })
  await db.ingredient.createMany({
    data: COMMON_ITEMS.filter(item => !have.has(ingredientKey(item.name))).map(item => ({
      familyId,
      name: item.name,
      nameKey: ingredientKey(item.name),
      aisle: item.aisle,
      common: true
    })),
    skipDuplicates: true
  })
}

export async function listCommonItems(familyId: string, db: Db = prisma): Promise<FamilyCommonItem[]> {
  await ensureCommonItems(familyId, db)
  const rows = await db.ingredient.findMany({ where: { familyId, common: true }, orderBy: { name: 'asc' } })
  return rows.map(row => ({ id: row.id, name: row.name, aisle: row.aisle as Aisle }))
}

// Adds an item to the family's list. A name the family already has as an ingredient keeps its aisle
// unless one is given; a new one uses the given aisle or a guess.
export async function addCommonItem(
  familyId: string,
  input: { name?: unknown; aisle?: unknown },
  db: Db = prisma
): Promise<FamilyCommonItem> {
  const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new CommonItemError('Skriv inn navnet på varen', 400)
  if (name.length > MAX_EXTRA_NAME_LENGTH) throw new CommonItemError('Navnet er for langt', 400)
  if (input.aisle !== undefined && !isAisle(input.aisle)) throw new CommonItemError('Ugyldig avdeling', 400)

  await ensureCommonItems(familyId, db)
  const nameKey = ingredientKey(name)
  const existing = await db.ingredient.findUnique({ where: { familyId_nameKey: { familyId, nameKey } } })
  if (existing?.common) throw new CommonItemError(`«${existing.name}» er allerede i listen`, 409)

  const row = existing
    ? await db.ingredient.update({
        where: { id: existing.id },
        data: { common: true, ...(input.aisle ? { aisle: input.aisle } : {}) }
      })
    : await db.ingredient.create({
        data: { familyId, name, nameKey, aisle: (input.aisle as Aisle | undefined) ?? guessAisle(name), common: true }
      })
  return { id: row.id, name: row.name, aisle: row.aisle as Aisle }
}

// Changes the aisle of one of the family's items (which also changes it for the ingredient itself)
export async function changeCommonItemAisle(familyId: string, id: string, aisle: unknown, db: Db = prisma): Promise<FamilyCommonItem> {
  if (!isAisle(aisle)) throw new CommonItemError('Ugyldig avdeling', 400)
  const result = await db.ingredient.updateMany({ where: { id, familyId, common: true }, data: { aisle } })
  if (result.count === 0) throw new CommonItemError('Fant ikke varen', 404)
  const row = await db.ingredient.findUniqueOrThrow({ where: { id } })
  return { id: row.id, name: row.name, aisle: row.aisle as Aisle }
}

// Takes an item off the list. The ingredient (and its aisle) stays, as recipes may use it.
export async function removeCommonItem(familyId: string, id: string, db: Db = prisma): Promise<void> {
  const result = await db.ingredient.updateMany({ where: { id, familyId, common: true }, data: { common: false } })
  if (result.count === 0) throw new CommonItemError('Fant ikke varen', 404)
}
