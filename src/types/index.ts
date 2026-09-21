import type { Aisle } from '../lib/aisle'

export type DishType = 'MEAT' | 'FISH' | 'VEGAN' | 'OTHER'

export type Day = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export type PlanOption = 'MANUAL' | 'ALGORITHM' | 'OTHER'

export interface Recipe {
  id: string
  name: string
  ingredients: string
  description?: string
  externalUrl?: string
  score: number
  type: DishType
  suitableDays: Day[]
  hibernating?: boolean
  familyId: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  // Link to the photo (Vercel Blob); `image` only says an older, not yet moved photo exists
  imageUrl?: string | null
  image?: RecipeImage
  steps?: RecipeStep[]
  eatenLogs?: EatenLog[]
}

export interface RecipeStep {
  id: string
  recipeId: string
  position: number
  title?: string | null
  text: string
}

// Recipe responses only say that a photo exists; the photo itself is fetched from
// /api/recipe-image/<id> (see recipeImageUrl in lib/recipe-image.ts)
export interface RecipeImage {
  id: string
}

export interface MealPlan {
  id: string
  date: Date
  option: PlanOption
  recipeId?: string
  recipe?: Recipe
  otherText?: string
  familyId: string
  plannedById: string
}

export interface EatenLog {
  id: string
  date: Date
  recipeId: string
  recipe?: Recipe
  familyId: string
}

export interface Family {
  id: string
  name: string
  inviteCode: string
  // The family's admin (its creator, or the oldest member for older families)
  adminId?: string | null
  members?: User[]
}

export interface User {
  id: string
  email: string
  name: string
  image?: string
  familyId?: string
  family?: Family
}

export const DISH_TYPE_OPTIONS: { value: DishType; label: string }[] = [
  { value: 'MEAT', label: 'Kjøtt' },
  { value: 'FISH', label: 'Fisk' },
  { value: 'VEGAN', label: 'Vegansk' },
  { value: 'OTHER', label: 'Annet' },
]

export const DISH_TYPE_LABELS: Record<DishType, string> = {
  MEAT: 'Kjøtt',
  FISH: 'Fisk',
  VEGAN: 'Vegansk',
  OTHER: 'Annet',
}

export const DAYS: { value: Day; label: string }[] = [
  { value: 'MONDAY', label: 'Mandag' },
  { value: 'TUESDAY', label: 'Tirsdag' },
  { value: 'WEDNESDAY', label: 'Onsdag' },
  { value: 'THURSDAY', label: 'Torsdag' },
  { value: 'FRIDAY', label: 'Fredag' },
  { value: 'SATURDAY', label: 'Lørdag' },
  { value: 'SUNDAY', label: 'Søndag' },
]

export const DAY_LABELS: Record<Day, string> = {
  MONDAY: 'mandag',
  TUESDAY: 'tirsdag',
  WEDNESDAY: 'onsdag',
  THURSDAY: 'torsdag',
  FRIDAY: 'fredag',
  SATURDAY: 'lørdag',
  SUNDAY: 'søndag',
}

export const DISH_TYPE_COLORS: Record<DishType, string> = {
  MEAT: 'bg-dish-meat text-dish-meat-foreground border-dish-meat-border',
  FISH: 'bg-dish-fish text-dish-fish-foreground border-dish-fish-border',
  VEGAN: 'bg-dish-vegan text-dish-vegan-foreground border-dish-vegan-border',
  OTHER: 'bg-dish-other text-dish-other-foreground border-dish-other-border',
}

export interface ShoppingListItem {
  id: string
  shoppingListId: string
  name: string
  sources: string[]
  aisle: Aisle
  checked: boolean
}

export interface ShoppingList {
  id: string
  familyId: string
  createdById: string
  createdAt: string
  dates: string[]
  items?: ShoppingListItem[]
  _count?: { items: number }
}
