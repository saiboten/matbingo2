import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { listKnownIngredients } from '../../lib/known-ingredients'
import { getFamilyUser } from '../../lib/session'

export const Route = createFileRoute('/api/known-ingredients')({
  server: {
    handlers: {
      // The ingredients the family has a shelf for, offered when adding an item to a shopping list
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ ingredients: await listKnownIngredients(who.familyId) })
        } catch (error) {
          console.error('Error fetching known ingredients:', error)
          return json({ error: 'Kunne ikke hente ingrediensene' }, { status: 500 })
        }
      }
    }
  }
})
