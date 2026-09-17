import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { markRecipeAsEaten } from '../../lib/algorithm'
import type { PlanOption } from '../../types'

export const Route = createFileRoute('/api/meal-plans')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')

        if (!familyId || !startDate || !endDate) {
          return json({ error: 'Missing required parameters' }, { status: 400 })
        }

        try {
          const mealPlans = await prisma.mealPlan.findMany({
            where: {
              familyId,
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate)
              }
            },
            include: {
              recipe: {
                include: {
                  image: true
                }
              }
            },
            orderBy: {
              date: 'asc'
            }
          })

          return json({ mealPlans })
        } catch (error) {
          console.error('Error fetching meal plans:', error)
          return json({ error: 'Failed to fetch meal plans' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { date, option, recipeId, otherText, familyId, plannedById } = body

          const mealPlan = await prisma.mealPlan.upsert({
            where: {
              familyId_date: {
                familyId,
                date: new Date(date)
              }
            },
            update: {
              option: option as PlanOption,
              recipeId,
              otherText,
              plannedById
            },
            create: {
              date: new Date(date),
              option: option as PlanOption,
              recipeId,
              otherText,
              familyId,
              plannedById
            },
            include: {
              recipe: {
                include: {
                  image: true
                }
              }
            }
          })

          // If it's a manual or algorithm selection with a recipe, mark it as eaten
          if ((option === 'MANUAL' || option === 'ALGORITHM') && recipeId) {
            await markRecipeAsEaten(recipeId, familyId, new Date(date))
          }

          return json({ mealPlan })
        } catch (error) {
          console.error('Error creating meal plan:', error)
          return json({ error: 'Failed to create meal plan' }, { status: 500 })
        }
      },

      DELETE: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const familyId = url.searchParams.get('familyId')
          const date = url.searchParams.get('date')

          if (!familyId || !date) {
            return json({ error: 'Missing required parameters' }, { status: 400 })
          }

          const parsedDate = new Date(date)
          const mealPlan = await prisma.mealPlan.findUnique({
            where: { familyId_date: { familyId, date: parsedDate } }
          })

          if (!mealPlan) {
            return json({ error: 'Meal plan not found' }, { status: 404 })
          }

          await prisma.$transaction([
            ...(mealPlan.recipeId
              ? [
                  prisma.eatenLog.deleteMany({
                    where: { familyId, recipeId: mealPlan.recipeId, date: parsedDate }
                  })
                ]
              : []),
            prisma.mealPlan.delete({ where: { id: mealPlan.id } })
          ])

          return json({ success: true })
        } catch (error) {
          console.error('Error deleting meal plan:', error)
          return json({ error: 'Failed to delete meal plan' }, { status: 500 })
        }
      }
    }
  }
})
