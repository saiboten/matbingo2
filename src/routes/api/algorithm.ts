import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { selectOptimalRecipe } from '../../lib/algorithm'

export const Route = createFileRoute('/api/algorithm')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { familyId, date, excludeRecipeIds, type, ingredients } = body

          if (!familyId || !date) {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const recipe = await selectOptimalRecipe(familyId, new Date(date), excludeRecipeIds || [], {
            type: type || undefined,
            ingredients: ingredients || undefined
          })

          if (!recipe) {
            return json({ error: 'Fant ingen passende oppskrift' }, { status: 404 })
          }

          return json({ recipe })
        } catch (error) {
          console.error('Error running algorithm:', error)
          return json({ error: 'Kunne ikke kjøre forslagsalgoritmen' }, { status: 500 })
        }
      }
    }
  }
})
