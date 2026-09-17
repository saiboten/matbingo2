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
  familyId: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  image?: RecipeImage
  eatenLogs?: EatenLog[]
}

export interface RecipeImage {
  id: string
  base64: string
  mimeType: string
  recipeId: string
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
  { value: 'MEAT', label: 'Meat' },
  { value: 'FISH', label: 'Fish' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'OTHER', label: 'Other' },
]

export const DAYS: { value: Day; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

export const DISH_TYPE_COLORS: Record<DishType, string> = {
  MEAT: 'bg-red-100 text-red-800 border-red-200',
  FISH: 'bg-blue-100 text-blue-800 border-blue-200',
  VEGAN: 'bg-green-100 text-green-800 border-green-200',
  OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
}
