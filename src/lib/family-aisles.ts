import { prisma } from './prisma'
import { AISLE_LABELS, AISLE_ORDER, MAX_AISLE_NAME_LENGTH, aisleNameKey, isBuiltInAisle, type FamilyAisle } from './aisle'

type Db = Pick<typeof prisma, 'familyAisle'>

export class AisleError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

// The aisles the family has made itself, oldest first (the order they are walked after the built-in ones)
export async function listFamilyAisles(familyId: string, db: Db = prisma): Promise<FamilyAisle[]> {
  return db.familyAisle.findMany({ where: { familyId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } })
}

// Makes a new aisle for the family. A name the family already has (or a built-in one) gives that
// aisle back instead of a second one with the same name.
export async function createFamilyAisle(familyId: string, rawName: unknown, db: Db = prisma): Promise<FamilyAisle> {
  const name = typeof rawName === 'string' ? rawName.replace(/\s+/g, ' ').trim() : ''
  if (!name) throw new AisleError('Skriv inn navnet på hyllen', 400)
  if (name.length > MAX_AISLE_NAME_LENGTH) throw new AisleError('Navnet er for langt', 400)

  const nameKey = aisleNameKey(name)
  const builtIn = AISLE_ORDER.find(aisle => aisleNameKey(AISLE_LABELS[aisle]) === nameKey)
  if (builtIn) return { id: builtIn, name: AISLE_LABELS[builtIn] }

  return db.familyAisle.upsert({
    where: { familyId_nameKey: { familyId, nameKey } },
    update: {},
    create: { familyId, name, nameKey },
    select: { id: true, name: true },
  })
}

// Whether `aisle` is one the family can put things on: a built-in one or one of its own
export async function isFamilyAisle(familyId: string, aisle: unknown, db: Db = prisma): Promise<boolean> {
  if (isBuiltInAisle(aisle)) return true
  if (typeof aisle !== 'string' || !aisle) return false
  return (await db.familyAisle.count({ where: { id: aisle, familyId } })) > 0
}
