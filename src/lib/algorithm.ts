import { differenceInDays } from 'date-fns'
import { prisma } from './prisma'
import type { Recipe, Day, DishType } from '../types'

interface RecipeWithScore {
  recipe: Recipe
  score: number
}

export interface SuggestionFilters {
  type?: DishType
  ingredients?: string[]
}

const DAYS_ARRAY: Day[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

export async function selectOptimalRecipe(
  familyId: string,
  date: Date,
  excludeRecipeIds: string[] = [],
  filters: SuggestionFilters = {}
): Promise<Recipe | null> {
  // Use the UTC day-of-week since dates are normalized to UTC midnight
  // calendar days; using local getDay() would drift by a day depending on
  // the server process's timezone relative to UTC.
  const dayOfWeek = date.getUTCDay()
  const dayEnum = DAYS_ARRAY[dayOfWeek]

  // Get all recipes suitable for this day
  const recipes = await prisma.recipe.findMany({
    where: {
      familyId,
      // Recipes the family has put to sleep are never suggested
      hibernating: false,
      suitableDays: {
        has: dayEnum
      },
      ...(excludeRecipeIds.length > 0 && { id: { notIn: excludeRecipeIds } }),
      ...(filters.type && { type: filters.type }),
      ...(filters.ingredients && filters.ingredients.length > 0 && {
        AND: filters.ingredients.map((ingredient) => ({
          ingredients: { contains: ingredient, mode: 'insensitive' as const }
        }))
      })
    },
    include: {
      image: true,
      eatenLogs: {
        where: {
          familyId
        },
        orderBy: {
          date: 'desc'
        },
        take: 1
      }
    }
  })
  
  if (recipes.length === 0) return null
  
  // Get recent meal types (last 7 days)
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  
  const recentMeals = await prisma.eatenLog.findMany({
    where: {
      familyId,
      date: {
        gte: sevenDaysAgo,
        lt: date
      }
    },
    include: {
      recipe: true
    }
  })
  
  const recentTypes = new Set(recentMeals.map(m => m.recipe.type))
  
  // Score each recipe
  const scoredRecipes: RecipeWithScore[] = recipes.map(recipe => {
    // Frequency 0 = never select automatically
    if (recipe.score === 0) {
      return { recipe: recipe as Recipe, score: -1000 }
    }
    
    let score = 0
    
    // 1. Base frequency score (0-100)
    score += recipe.score * 10
    
    // 2. Type diversity bonus (up to 50 points)
    if (!recentTypes.has(recipe.type as DishType)) {
      score += 50
    }
    
    // 3. Last eaten penalty/bonus
    const lastEaten = recipe.eatenLogs[0]?.date
    if (lastEaten) {
      const daysSince = differenceInDays(date, lastEaten)
      const minDays = calculateMinDays(recipe.score)
      
      if (daysSince < minDays) {
        // Heavy penalty if eaten too recently
        const penalty = (minDays - daysSince) * 20
        score -= penalty
      } else {
        // Small bonus for variety (max 10 points)
        score += Math.min(daysSince - minDays, 10)
      }
    } else {
      // Bonus for never eaten recipes
      score += 20
    }
    
    return { recipe: recipe as Recipe, score }
  })
  
  // Sort by score and return best match
  scoredRecipes.sort((a, b) => b.score - a.score)
  
  // Only return if score is positive
  return scoredRecipes[0]?.score > 0 ? scoredRecipes[0].recipe : null
}

function calculateMinDays(frequency: number): number {
  // Frequency 10: can eat every 3 days
  // Frequency 5: can eat every 7 days  
  // Frequency 0: never (handled above)
  if (frequency === 0) return Infinity
  return Math.max(3, Math.round(30 - (frequency * 2.7)))
}

export async function markRecipeAsEaten(
  recipeId: string,
  familyId: string,
  date: Date
) {
  return prisma.eatenLog.create({
    data: {
      recipeId,
      familyId,
      date
    }
  })
}
