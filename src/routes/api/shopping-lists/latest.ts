import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { aisleRank } from '../../../lib/aisle'
import { latestShoppingList } from '../../../lib/simple-mode'
import { getFamilyUser } from '../../../lib/session'

export const Route = createFileRoute('/api/shopping-lists/latest')({
  server: {
    handlers: {
      // The family's most recently created list (or null), sorted by aisle
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const shoppingList = await latestShoppingList(who.familyId)
          shoppingList?.items.sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.name.localeCompare(b.name, 'nb'))
          return json({ shoppingList })
        } catch (error) {
          console.error('Error fetching latest shopping list:', error)
          return json({ error: 'Kunne ikke hente handlelisten' }, { status: 500 })
        }
      }
    }
  }
})
