import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { parseImageInput } from '../../lib/blueprint-input'
import { ImageStorageError, storeImage } from '../../lib/image-storage'
import type { Day, DishType } from '../../types'

export const Route = createFileRoute('/api/recipes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')
        const type = url.searchParams.get('type') as DishType | null
        const minScore = url.searchParams.get('minScore')
        const search = url.searchParams.get('search')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        const where: any = { familyId }

        if (type) {
          where.type = type
        }

        if (minScore) {
          where.score = { gte: parseInt(minScore) }
        }

        if (search) {
          where.name = { contains: search, mode: 'insensitive' }
        }

        const recipes = await prisma.recipe.findMany({
          where,
          include: {
            image: { select: { id: true } },
            _count: {
              select: {
                eatenLogs: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        })

        return json({ recipes })
      },

      POST: async ({ request }) => {
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
            familyId,
            createdById,
            image
          } = body

          const photo = parseImageInput(image)
          if (!photo.ok) return json({ error: photo.error }, { status: 400 })
          // The photo goes to Blob first; only its link is saved with the recipe
          const imageUrl = photo.value ? await storeImage(photo.value, 'recipes') : undefined

          const recipe = await prisma.recipe.create({
            data: {
              name,
              ingredients,
              description,
              externalUrl,
              score: parseInt(score),
              type: type as DishType,
              suitableDays: suitableDays as Day[],
              familyId,
              createdById,
              imageUrl
            },
            include: {
              image: { select: { id: true } }
            }
          })

          return json({ recipe })
        } catch (error) {
          console.error('Error creating recipe:', error)
          if (error instanceof ImageStorageError) return json({ error: error.message }, { status: 500 })
          return json({ error: 'Kunne ikke opprette oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
