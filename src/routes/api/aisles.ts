import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { AisleError, createFamilyAisle, listFamilyAisles } from '../../lib/family-aisles'
import { getFamilyUser } from '../../lib/session'

// The aisles the family has made itself (the built-in ones are in lib/aisle.ts). The family always
// comes from the signed-in session.
export const Route = createFileRoute('/api/aisles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ aisles: await listFamilyAisles(who.familyId) })
        } catch (error) {
          console.error('Error fetching aisles:', error)
          return json({ error: 'Kunne ikke hente hyllene' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { name } = await request.json()
          return json({ aisle: await createFamilyAisle(who.familyId, name) })
        } catch (error) {
          if (error instanceof AisleError) return json({ error: error.message }, { status: error.status })
          console.error('Error creating aisle:', error)
          return json({ error: 'Kunne ikke lage hyllen' }, { status: 500 })
        }
      }
    }
  }
})
