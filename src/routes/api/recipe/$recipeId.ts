import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import type { Day, DishType } from '../../../types'

export const Route = createFileRoute('/api/recipe/$recipeId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const recipe = await prisma.recipe.findUnique({
            where: { id: params.recipeId },
            include: {
              image: true,
              eatenLogs: {
                orderBy: { date: 'desc' },
                take: 5
              }
            }
          })

          if (!recipe) {
            return json({ error: 'Recipe not found' }, { status: 404 })
          }

          return json({ recipe })
        } catch (error) {
          return json({ error: 'Failed to fetch recipe' }, { status: 500 })
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
            image
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

          // Handle image update
          if (image) {
            await prisma.recipeImage.upsert({
              where: { recipeId: params.recipeId },
              update: {
                base64: image.base64,
                mimeType: image.mimeType
              },
              create: {
                base64: image.base64,
                mimeType: image.mimeType,
                recipeId: params.recipeId
              }
            })
          }

          const recipe = await prisma.recipe.update({
            where: { id: params.recipeId },
            data: updateData,
            include: {
              image: true
            }
          })

          return json({ recipe })
        } catch (error) {
          console.error('Error updating recipe:', error)
          return json({ error: 'Failed to update recipe' }, { status: 500 })
        }
      },

      DELETE: async ({ params }) => {
        try {
          await prisma.recipe.delete({
            where: { id: params.recipeId }
          })

          return json({ success: true })
        } catch (error) {
          console.error('Error deleting recipe:', error)
          return json({ error: 'Failed to delete recipe' }, { status: 500 })
        }
      }
    }
  }
})
