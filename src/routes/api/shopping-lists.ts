import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { ShoppingListError, createShoppingList } from '../../lib/create-shopping-list'
import { getFamilyUser } from '../../lib/session'

export const Route = createFileRoute('/api/shopping-lists')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const shoppingLists = await prisma.shoppingList.findMany({
            where: { familyId },
            include: { _count: { select: { items: true } } },
            orderBy: { createdAt: 'desc' }
          })

          return json({ shoppingLists })
        } catch (error) {
          console.error('Error fetching shopping lists:', error)
          return json({ error: 'Kunne ikke hente handlelistene' }, { status: 500 })
        }
      },

      // Makes a list from the recipes on the chosen days plus any extra items. The family and the
      // user come from the signed-in session, never from the request.
      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error

        try {
          const { dates, extras } = await request.json()
          const shoppingList = await createShoppingList({
            familyId: who.familyId,
            userId: who.userId,
            days: dates,
            extras
          })

          return json({ shoppingList })
        } catch (error) {
          if (error instanceof ShoppingListError) {
            return json({ error: error.message }, { status: error.status })
          }
          console.error('Error creating shopping list:', error)
          return json({ error: 'Kunne ikke opprette handlelisten' }, { status: 500 })
        }
      }
    }
  }
})
