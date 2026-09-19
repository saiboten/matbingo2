import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'

export const Route = createFileRoute('/api/recipe-overview')({
  server: {
    handlers: {
      // Light-weight list of the family's recipes (no images) with how often each was eaten
      GET: async ({ request }) => {
        const familyId = new URL(request.url).searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const recipes = await prisma.recipe.findMany({
            where: { familyId },
            select: {
              id: true,
              name: true,
              type: true,
              score: true,
              hibernating: true,
              _count: { select: { eatenLogs: true } },
              eatenLogs: { orderBy: { date: 'desc' }, take: 1, select: { date: true } }
            },
            orderBy: { name: 'asc' }
          })

          return json({
            recipes: recipes.map(({ _count, eatenLogs, ...recipe }) => ({
              ...recipe,
              eatenCount: _count.eatenLogs,
              lastEaten: eatenLogs[0]?.date ?? null
            }))
          })
        } catch (error) {
          console.error('Error fetching recipe overview:', error)
          return json({ error: 'Kunne ikke hente oppskriftene' }, { status: 500 })
        }
      },

      PATCH: async ({ request }) => {
        try {
          const { familyId, id, hibernating } = await request.json()

          if (!familyId || !id || typeof hibernating !== 'boolean') {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const result = await prisma.recipe.updateMany({
            where: { id, familyId },
            data: { hibernating }
          })

          if (result.count === 0) {
            return json({ error: 'Fant ikke oppskriften' }, { status: 404 })
          }

          return json({ success: true })
        } catch (error) {
          console.error('Error updating recipe hibernation:', error)
          return json({ error: 'Kunne ikke oppdatere oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
