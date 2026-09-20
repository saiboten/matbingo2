import { prisma } from './prisma'
import { blueprintRecipeData, matchAddedBlueprints, toBlueprint } from './blueprints'

// An error that is safe to show the user, with the HTTP status the API route should answer with
export class BlueprintError extends Error {
  constructor(message: string, public status: number, public recipeId?: string) {
    super(message)
  }
}

type Db = Pick<typeof prisma, 'recipe' | 'blueprint'>

// Copies a blueprint into the family's own recipes, steps and photo included. The copy is independent
// of the blueprint: editing it later changes only the family's recipe.
export async function addBlueprintToFamily(
  input: { blueprintId: string; familyId: string; userId: string },
  db: Db = prisma
): Promise<{ id: string }> {
  const row = await db.blueprint.findUnique({
    where: { id: input.blueprintId },
    include: { steps: { orderBy: { position: 'asc' } }, image: true },
  })
  if (!row) throw new BlueprintError('Fant ikke oppskriften i biblioteket', 404)

  const blueprint = toBlueprint(row)

  const existing = await db.recipe.findMany({
    where: { familyId: input.familyId },
    select: { id: true, name: true },
  })
  const alreadyAdded = matchAddedBlueprints([blueprint], existing)[blueprint.id]
  if (alreadyAdded) {
    throw new BlueprintError(`Du har allerede en oppskrift som heter «${blueprint.name}»`, 409, alreadyAdded)
  }

  const { steps, ...recipe } = blueprintRecipeData(blueprint)
  return db.recipe.create({
    data: {
      ...recipe,
      familyId: input.familyId,
      createdById: input.userId,
      steps: { create: steps },
      ...(row.image && { image: { create: { base64: row.image.base64, mimeType: row.image.mimeType } } }),
    },
    select: { id: true },
  })
}
