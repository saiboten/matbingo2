import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import { normalizeSteps } from '../../../lib/recipe-steps'
import { parseImageInput } from '../../../lib/blueprint-input'
import { ImageStorageError, deleteImage, storeImage } from '../../../lib/image-storage'
import type { Day, DishType } from '../../../types'

export const Route = createFileRoute('/api/recipe/$recipeId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const recipe = await prisma.recipe.findUnique({
            where: { id: params.recipeId },
            include: {
              image: { select: { id: true } },
              steps: { orderBy: { position: 'asc' } },
              eatenLogs: {
                orderBy: { date: 'desc' },
                take: 5
              }
            }
          })

          if (!recipe) {
            return json({ error: 'Fant ikke oppskriften' }, { status: 404 })
          }

          return json({ recipe })
        } catch (error) {
          return json({ error: 'Kunne ikke hente oppskriften' }, { status: 500 })
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const body = await request.json()
          const {
            name,
            ingredients,
            description,
            externalUrl,
            score,
            type,
            suitableDays,
            image,
            steps
          } = body

          const updateData: any = {
            name,
            ingredients,
            description,
            externalUrl,
            score: parseInt(score),
            type: type as DishType,
            suitableDays: suitableDays as Day[]
          }

          // A new photo is uploaded to Blob and only its link is saved; the old file is removed afterwards
          let replacedImageUrl: string | null = null
          const photo = parseImageInput(image)
          if (!photo.ok) return json({ error: photo.error }, { status: 400 })
          if (photo.value) {
            const current = await prisma.recipe.findUnique({ where: { id: params.recipeId }, select: { imageUrl: true } })
            replacedImageUrl = current?.imageUrl ?? null
            updateData.imageUrl = await storeImage(photo.value, 'recipes')
          }

          // Steps are replaced as a whole when the editor sends them; left alone when it doesn't
          if (steps !== undefined) {
            const cleanSteps = normalizeSteps(steps)
            await prisma.$transaction([
              prisma.recipeStep.deleteMany({ where: { recipeId: params.recipeId } }),
              prisma.recipeStep.createMany({
                data: cleanSteps.map((step, index) => ({
                  recipeId: params.recipeId,
                  position: index + 1,
                  title: step.title || null,
                  text: step.text
                }))
              })
            ])
          }

          const recipe = await prisma.recipe.update({
            where: { id: params.recipeId },
            data: updateData,
            include: {
              image: { select: { id: true } },
              steps: { orderBy: { position: 'asc' } }
            }
          })

          await deleteImage(replacedImageUrl)

          return json({ recipe })
        } catch (error) {
          console.error('Error updating recipe:', error)
          if (error instanceof ImageStorageError) return json({ error: error.message }, { status: 500 })
          return json({ error: 'Kunne ikke oppdatere oppskriften' }, { status: 500 })
        }
      },

      DELETE: async ({ params }) => {
        try {
          const existing = await prisma.recipe.findUnique({ where: { id: params.recipeId }, select: { imageUrl: true } })
          await prisma.recipe.delete({
            where: { id: params.recipeId }
          })
          await deleteImage(existing?.imageUrl)

          return json({ success: true })
        } catch (error) {
          console.error('Error deleting recipe:', error)
          return json({ error: 'Kunne ikke slette oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
