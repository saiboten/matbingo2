import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { resolveAisles, ingredientKey } from '../../lib/ingredients'
import { AISLE_ORDER, type Aisle } from '../../lib/aisle'

export const Route = createFileRoute('/api/ingredient-aisles')({
  server: {
    handlers: {
      // Every ingredient used by the family's recipes, with its aisle. Ingredients that don't have
      // a row yet (e.g. from recipes added since the last shopping list) get one with a guessed aisle.
      GET: async ({ request }) => {
        const familyId = new URL(request.url).searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const recipes = await prisma.recipe.findMany({
            where: { familyId },
            select: { ingredients: true }
          })
          const names = recipes.flatMap(r =>
            r.ingredients.split(',').map(n => n.trim()).filter(Boolean)
          )
          await resolveAisles(familyId, names)

          const used = new Set(names.map(ingredientKey))
          const rows = await prisma.ingredient.findMany({
            where: { familyId },
            orderBy: { name: 'asc' }
          })

          return json({ ingredients: rows.filter(row => used.has(row.nameKey)) })
        } catch (error) {
          console.error('Error fetching ingredient aisles:', error)
          return json({ error: 'Kunne ikke hente ingrediensene' }, { status: 500 })
        }
      },

      PATCH: async ({ request }) => {
        try {
          const { familyId, id, aisle } = await request.json()

          if (!familyId || !id || !AISLE_ORDER.includes(aisle as Aisle)) {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const result = await prisma.ingredient.updateMany({
            where: { id, familyId },
            data: { aisle }
          })

          if (result.count === 0) {
            return json({ error: 'Fant ikke ingrediensen' }, { status: 404 })
          }

          return json({ success: true })
        } catch (error) {
          console.error('Error updating ingredient aisle:', error)
          return json({ error: 'Kunne ikke oppdatere ingrediensen' }, { status: 500 })
        }
      }
    }
  }
})
