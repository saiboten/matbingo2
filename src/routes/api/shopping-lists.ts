import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { buildShoppingItems } from '../../lib/shopping-list'
import { resolveAisles, ingredientKey } from '../../lib/ingredients'
import { aisleRank } from '../../lib/aisle'

export const Route = createFileRoute('/api/shopping-lists')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const shoppingLists = await prisma.shoppingList.findMany({
            where: { familyId },
            include: { _count: { select: { items: true } } },
            orderBy: { createdAt: 'desc' }
          })

          return json({ shoppingLists })
        } catch (error) {
          console.error('Error fetching shopping lists:', error)
          return json({ error: 'Kunne ikke hente handlelistene' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        try {
          const { familyId, createdById, dates } = await request.json()

          if (!familyId || !createdById || !Array.isArray(dates) || dates.length === 0) {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const parsedDates = dates.map((d: string) => new Date(d))
          const mealPlans = await prisma.mealPlan.findMany({
            where: { familyId, date: { in: parsedDates }, recipeId: { not: null } },
            include: { recipe: true },
            orderBy: { date: 'asc' }
          })

          if (mealPlans.length === 0) {
            return json({ error: 'Ingen oppskrifter på de valgte dagene' }, { status: 400 })
          }

          const recipes = mealPlans.flatMap(plan => (plan.recipe ? [plan.recipe] : []))
          const drafts = buildShoppingItems(recipes)
          const aisles = await resolveAisles(familyId, drafts.map(item => item.name))
          const items = drafts
            .map(item => ({ ...item, aisle: aisles.get(ingredientKey(item.name)) ?? 'OTHER' }))
            .sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.name.localeCompare(b.name))

          const shoppingList = await prisma.shoppingList.create({
            data: {
              familyId,
              createdById,
              dates: mealPlans.map(plan => plan.date),
              items: { create: items }
            },
            include: { items: true }
          })

          return json({ shoppingList })
        } catch (error) {
          console.error('Error creating shopping list:', error)
          return json({ error: 'Kunne ikke opprette handlelisten' }, { status: 500 })
        }
      }
    }
  }
})
