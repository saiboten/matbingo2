import { prisma } from './prisma'
import { blueprintRecipeData, findBlueprint, matchAddedBlueprints } from './blueprints'

// An error that is safe to show the user, with the HTTP status the API route should answer with
export class BlueprintError extends Error {
  constructor(message: string, public status: number, public recipeId?: string) {
    super(message)
  }
}

type Db = Pick<typeof prisma, 'recipe'>

// Copies a blueprint into the family's own recipes, steps included. The copy is independent of the
// blueprint: editing it later changes only the family's recipe.
export async function addBlueprintToFamily(
  input: { blueprintId: string; familyId: string; userId: string },
  db: Db = prisma
): Promise<{ id: string }> {
  const blueprint = findBlueprint(input.blueprintId)
  if (!blueprint) throw new BlueprintError('Fant ikke oppskriften i biblioteket', 404)

  const existing = await db.recipe.findMany({
    where: { familyId: input.familyId },
    select: { id: true, name: true }
  })
  const alreadyAdded = matchAddedBlueprints([blueprint], existing)[blueprint.id]
  if (alreadyAdded) {
    throw new BlueprintError(`Du har allerede en oppskrift som heter «${blueprint.name}»`, 409, alreadyAdded)
  }

  const { steps, ...recipe } = blueprintRecipeData(blueprint)
  const created = await db.recipe.create({
    data: {
      ...recipe,
      familyId: input.familyId,
      createdById: input.userId,
      steps: { create: steps }
    },
    select: { id: true }
  })

  return created
}
