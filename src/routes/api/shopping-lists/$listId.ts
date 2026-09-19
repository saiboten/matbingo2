import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import { aisleRank } from '../../../lib/aisle'

export const Route = createFileRoute('/api/shopping-lists/$listId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const familyId = new URL(request.url).searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const shoppingList = await prisma.shoppingList.findFirst({
            where: { id: params.listId, familyId },
            include: { items: { orderBy: { name: 'asc' } } }
          })

          if (!shoppingList) {
            return json({ error: 'Fant ikke handlelisten' }, { status: 404 })
          }

          shoppingList.items.sort(
            (a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.name.localeCompare(b.name)
          )

          return json({ shoppingList })
        } catch (error) {
          console.error('Error fetching shopping list:', error)
          return json({ error: 'Kunne ikke hente handlelisten' }, { status: 500 })
        }
      },

      PATCH: async ({ request, params }) => {
        try {
          const { familyId, itemId, checked } = await request.json()

          if (!familyId || !itemId || typeof checked !== 'boolean') {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const result = await prisma.shoppingListItem.updateMany({
            where: { id: itemId, shoppingListId: params.listId, shoppingList: { familyId } },
            data: { checked }
          })

          if (result.count === 0) {
            return json({ error: 'Fant ikke varen' }, { status: 404 })
          }

          return json({ success: true })
        } catch (error) {
          console.error('Error updating shopping list item:', error)
          return json({ error: 'Kunne ikke oppdatere varen' }, { status: 500 })
        }
      },

      DELETE: async ({ request, params }) => {
        const familyId = new URL(request.url).searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const result = await prisma.shoppingList.deleteMany({
            where: { id: params.listId, familyId }
          })

          if (result.count === 0) {
            return json({ error: 'Fant ikke handlelisten' }, { status: 404 })
          }

          return json({ success: true })
        } catch (error) {
          console.error('Error deleting shopping list:', error)
          return json({ error: 'Kunne ikke slette handlelisten' }, { status: 500 })
        }
      }
    }
  }
})
