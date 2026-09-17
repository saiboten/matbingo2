import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { selectOptimalRecipe } from '../../lib/algorithm'

export const Route = createFileRoute('/api/algorithm')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { familyId, date, excludeRecipeIds } = body

          if (!familyId || !date) {
            return json({ error: 'Missing required parameters' }, { status: 400 })
          }

          const recipe = await selectOptimalRecipe(familyId, new Date(date), excludeRecipeIds || [])

          if (!recipe) {
            return json({ error: 'No suitable recipe found' }, { status: 404 })
          }

          return json({ recipe })
        } catch (error) {
          console.error('Error running algorithm:', error)
          return json({ error: 'Failed to run algorithm' }, { status: 500 })
        }
      }
    }
  }
})
