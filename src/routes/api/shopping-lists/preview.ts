import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { previewShoppingItems } from '../../../lib/create-shopping-list'
import { getFamilyUser } from '../../../lib/session'

export const Route = createFileRoute('/api/shopping-lists/preview')({
  server: {
    handlers: {
      // What the recipes on the chosen days (?dates=2026-09-14,2026-09-15) would put on the list.
      // Only reads: nothing is created.
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error

        try {
          const dates = (new URL(request.url).searchParams.get('dates') ?? '').split(',').filter(Boolean)
          return json(await previewShoppingItems({ familyId: who.familyId, days: dates }))
        } catch (error) {
          console.error('Error previewing shopping list:', error)
          return json({ error: 'Kunne ikke hente varene' }, { status: 500 })
        }
      }
    }
  }
})
