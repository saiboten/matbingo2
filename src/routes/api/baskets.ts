import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { BasketError, createBasket, listBaskets } from '../../lib/baskets'
import { getFamilyUser } from '../../lib/session'

function fail(error: unknown, message: string) {
  if (error instanceof BasketError) return json({ error: error.message }, { status: error.status })
  console.error(`${message}:`, error)
  return json({ error: message }, { status: 500 })
}

// The family's baskets of things bought again and again. The family comes from the signed-in session.
export const Route = createFileRoute('/api/baskets')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ baskets: await listBaskets(who.familyId) })
        } catch (error) {
          return fail(error, 'Kunne ikke hente kurvene')
        }
      },

      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { name, items } = await request.json()
          return json({ basket: await createBasket(who.familyId, { name, items }) })
        } catch (error) {
          return fail(error, 'Kunne ikke lagre kurven')
        }
      }
    }
  }
})
