import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import {
  ShoppingListError,
  addListItem,
  readFamilyList,
  removeListItem,
  setItemQuantity,
  setItemsChecked
} from '../../lib/family-shopping-list'
import { getFamilyUser } from '../../lib/session'

function fail(error: unknown, message: string) {
  if (error instanceof ShoppingListError) return json({ error: error.message }, { status: error.status })
  console.error(`${message}:`, error)
  return json({ error: message }, { status: 500 })
}

// The family's one shopping list. The family always comes from the signed-in session.
export const Route = createFileRoute('/api/shopping-list')({
  server: {
    handlers: {
      // Also brings the recipe items up to date with the meal plan
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ shoppingList: await readFamilyList(who.familyId, who.userId) })
        } catch (error) {
          return fail(error, 'Kunne ikke hente handlelisten')
        }
      },

      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { name, aisle } = await request.json()
          return json({ item: await addListItem(who.familyId, who.userId, name, undefined, aisle ?? undefined) })
        } catch (error) {
          return fail(error, 'Kunne ikke legge til varen')
        }
      },

      PATCH: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          const { itemIds, checked, itemId, quantity } = await request.json()
          if (quantity !== undefined) await setItemQuantity(who.familyId, itemId, quantity)
          else await setItemsChecked(who.familyId, itemIds, checked)
          return json({ success: true })
        } catch (error) {
          return fail(error, 'Kunne ikke oppdatere varen')
        }
      },

      DELETE: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          await removeListItem(who.familyId, new URL(request.url).searchParams.get('itemId'))
          return json({ success: true })
        } catch (error) {
          return fail(error, 'Kunne ikke fjerne varen')
        }
      }
    }
  }
})
