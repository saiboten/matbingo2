import { prisma } from './prisma'
import { copyImage, storeImage, type BlobClient } from './image-storage'
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
  db: Db = prisma,
  blobClient?: BlobClient
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

  // The copy gets its own file, so removing the recipe never breaks the library photo. A photo that
  // hasn't been moved to Blob yet is uploaded from its base64 copy.
  const imageUrl = row.imageUrl
    ? await copyImage(row.imageUrl, 'recipes', blobClient)
    : row.image
      ? await storeImage({ base64: row.image.base64, mimeType: row.image.mimeType }, 'recipes', blobClient)
      : undefined

  const { steps, ...recipe } = blueprintRecipeData(blueprint)
  return db.recipe.create({
    data: {
      ...recipe,
      familyId: input.familyId,
      createdById: input.userId,
      steps: { create: steps },
      imageUrl,
    },
    select: { id: true },
  })
}
