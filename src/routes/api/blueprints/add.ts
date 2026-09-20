import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { BlueprintError, addBlueprintToFamily } from '../../../lib/add-blueprint'
import { getFamilyUser } from '../../../lib/session'

export const Route = createFileRoute('/api/blueprints/add')({
  server: {
    handlers: {
      // Copies a blueprint into the signed-in user's own family
      POST: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error

        try {
          const { blueprintId } = await request.json()

          if (typeof blueprintId !== 'string' || !blueprintId) {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const recipe = await addBlueprintToFamily({ blueprintId, familyId: who.familyId, userId: who.userId })
          return json({ recipe })
        } catch (error) {
          if (error instanceof BlueprintError) {
            return json({ error: error.message, recipeId: error.recipeId }, { status: error.status })
          }
          console.error('Error adding blueprint:', error)
          return json({ error: 'Kunne ikke legge til oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
