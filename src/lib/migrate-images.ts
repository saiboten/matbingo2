import { prisma } from './prisma'
import { storeImage, type BlobClient } from './image-storage'

type Db = Pick<typeof prisma, 'recipe' | 'blueprint' | 'recipeImage' | 'blueprintImage'>

export interface MigrationReport {
  recipes: { pending: number; moved: number; failed: { id: string; error: string }[] }
  blueprints: { pending: number; moved: number; failed: { id: string; error: string }[] }
  bytes: number
}

// Moves every photo that only exists as base64 in the database to Blob and saves the link on the
// recipe / blueprint. Safe to run again: rows that already have a link are skipped, and the old
// base64 rows are never touched. Ids are collected first and photos are loaded one at a time, so
// memory stays small however many photos there are.
export async function migrateImages(
  options: { db?: Db; client?: BlobClient; dryRun?: boolean; log?: (line: string) => void } = {}
): Promise<MigrationReport> {
  const { db = prisma, client, dryRun = false, log = () => {} } = options
  const report: MigrationReport = {
    recipes: { pending: 0, moved: 0, failed: [] },
    blueprints: { pending: 0, moved: 0, failed: [] },
    bytes: 0
  }

  const recipeIds = await db.recipe.findMany({ where: { imageUrl: null, image: { isNot: null } }, select: { id: true } })
  report.recipes.pending = recipeIds.length
  for (const { id } of recipeIds) {
    try {
      const image = await db.recipeImage.findUnique({ where: { recipeId: id }, select: { base64: true, mimeType: true } })
      if (!image) continue
      report.bytes += Math.floor((image.base64.length * 3) / 4)
      if (dryRun) continue
      const imageUrl = await storeImage(image, 'recipes', client)
      await db.recipe.update({ where: { id }, data: { imageUrl }, select: { id: true } })
      report.recipes.moved++
      log(`oppskrift ${id} -> ${imageUrl}`)
    } catch (error) {
      report.recipes.failed.push({ id, error: error instanceof Error ? error.message : String(error) })
    }
  }

  const blueprintIds = await db.blueprint.findMany({ where: { imageUrl: null, image: { isNot: null } }, select: { id: true } })
  report.blueprints.pending = blueprintIds.length
  for (const { id } of blueprintIds) {
    try {
      const image = await db.blueprintImage.findUnique({ where: { blueprintId: id }, select: { base64: true, mimeType: true } })
      if (!image) continue
      report.bytes += Math.floor((image.base64.length * 3) / 4)
      if (dryRun) continue
      const imageUrl = await storeImage(image, 'blueprints', client)
      await db.blueprint.update({ where: { id }, data: { imageUrl }, select: { id: true } })
      report.blueprints.moved++
      log(`blueprint ${id} -> ${imageUrl}`)
    } catch (error) {
      report.blueprints.failed.push({ id, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return report
}
