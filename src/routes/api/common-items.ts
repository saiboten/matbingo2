import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { CommonItemError, addCommonItem, changeCommonItemAisle, listCommonItems, removeCommonItem } from '../../lib/common-items'
import { getFamilyUser } from '../../lib/session'

function fail(error: unknown, fallback: string) {
  if (error instanceof CommonItemError) return json({ error: error.message }, { status: error.status })
  console.error(fallback, error)
  return json({ error: fallback }, { status: 500 })
}

// The family's everyday items. The family always comes from the signed-in session.
export const Route = createFileRoute('/api/common-items')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ items: await listCommonItems(who.familyId) })
        } catch (error) {
          return fail(error, 'Kunne ikke hente vanlige varer')
        }
      },

      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { name, aisle } = await request.json()
          return json({ item: await addCommonItem(who.familyId, { name, aisle }) })
        } catch (error) {
          return fail(error, 'Kunne ikke legge til varen')
        }
      },

      PATCH: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { id, aisle } = await request.json()
          return json({ item: await changeCommonItemAisle(who.familyId, String(id), aisle) })
        } catch (error) {
          return fail(error, 'Kunne ikke endre avdelingen')
        }
      },

      DELETE: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { id } = await request.json()
          await removeCommonItem(who.familyId, String(id))
          return json({ success: true })
        } catch (error) {
          return fail(error, 'Kunne ikke fjerne varen')
        }
      }
    }
  }
})
