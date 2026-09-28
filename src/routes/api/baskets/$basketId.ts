import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { BasketError, addBasketToList, deleteBasket, getBasket, updateBasket } from '../../../lib/baskets'
import { getFamilyUser } from '../../../lib/session'

function fail(error: unknown, message: string) {
  if (error instanceof BasketError) return json({ error: error.message }, { status: error.status })
  console.error(`${message}:`, error)
  return json({ error: message }, { status: 500 })
}

export const Route = createFileRoute('/api/baskets/$basketId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ basket: await getBasket(who.familyId, params.basketId) })
        } catch (error) {
          return fail(error, 'Kunne ikke hente kurven')
        }
      },

      // Puts everything in the basket on the family's shopping list
      POST: async ({ request, params }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ added: await addBasketToList(who.familyId, who.userId, params.basketId) })
        } catch (error) {
          return fail(error, 'Kunne ikke legge kurven i handlelisten')
        }
      },

      PUT: async ({ request, params }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { name, items } = await request.json()
          return json({ basket: await updateBasket(who.familyId, params.basketId, { name, items }) })
        } catch (error) {
          return fail(error, 'Kunne ikke lagre kurven')
        }
      },

      DELETE: async ({ request, params }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          await deleteBasket(who.familyId, params.basketId)
          return json({ success: true })
        } catch (error) {
          return fail(error, 'Kunne ikke slette kurven')
        }
      }
    }
  }
})
