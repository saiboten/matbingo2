import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'

export const Route = createFileRoute('/api/ingredients')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Family ID required' }, { status: 400 })
        }

        const recipes = await prisma.recipe.findMany({
          where: { familyId },
          select: { ingredients: true }
        })

        const seen = new Map<string, string>()
        for (const recipe of recipes) {
          for (const raw of recipe.ingredients.split(',')) {
            const name = raw.trim()
            if (!name) continue
            const key = name.toLowerCase()
            if (!seen.has(key)) seen.set(key, name)
          }
        }

        const ingredients = Array.from(seen.values()).sort((a, b) => a.localeCompare(b))

        return json({ ingredients })
      }
    }
  }
})
