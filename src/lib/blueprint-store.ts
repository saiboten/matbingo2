import { prisma } from './prisma'
import { BLUEPRINT_SEEDS } from '../data/blueprint-recipes'
import { toBlueprint, type Blueprint } from './blueprints'

type Db = Pick<typeof prisma, 'blueprint' | 'blueprintStep'>

const WITH_STEPS_AND_IMAGE_MARKER = {
  steps: { orderBy: { position: 'asc' as const } },
  image: { select: { id: true } },
}

// The library starts with the built-in blueprints: when there are none in the database (a new
// database, or every blueprint was deleted), they are inserted. Safe to call at the same time from
// several requests: duplicates are skipped.
export async function ensureBlueprintsSeeded(db: Db = prisma): Promise<void> {
  if ((await db.blueprint.count()) > 0) return

  await db.blueprint.createMany({
    data: BLUEPRINT_SEEDS.map((seed, index) => ({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      ingredients: seed.ingredients,
      type: seed.type,
      score: seed.score,
      suitableDays: seed.suitableDays ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      position: index,
    })),
    skipDuplicates: true,
  })
  await db.blueprintStep.createMany({
    data: BLUEPRINT_SEEDS.flatMap(seed =>
      seed.steps.map(([title, text], index) => ({ blueprintId: seed.id, position: index + 1, title, text }))
    ),
    skipDuplicates: true,
  })
}

export async function listBlueprints(db: Db = prisma): Promise<Blueprint[]> {
  await ensureBlueprintsSeeded(db)
  const rows = await db.blueprint.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: WITH_STEPS_AND_IMAGE_MARKER,
  })
  return rows.map(toBlueprint)
}

export async function getBlueprintById(id: string, db: Db = prisma): Promise<Blueprint | null> {
  const row = await db.blueprint.findUnique({ where: { id }, include: WITH_STEPS_AND_IMAGE_MARKER })
  return row ? toBlueprint(row) : null
}
