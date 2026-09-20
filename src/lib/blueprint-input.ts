import { DAYS, DISH_TYPE_OPTIONS } from '../types'
import type { Day, DishType } from '../types'
import { formatIngredients, parseIngredients } from './ingredient-text'
import { normalizeSteps, type StepDraft } from './recipe-steps'
import { safeImageMimeType } from './recipe-image'

export interface BlueprintInput {
  name: string
  description: string | null
  ingredients: string
  type: DishType
  score: number
  suitableDays: Day[]
  steps: StepDraft[]
}

// Same limit as recipe photos (2 MB), as base64 text
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 16

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

// Validates what the admin form sends, with the same rules as a normal recipe: a name, at least one
// ingredient, a dish type, a frequency 0-10 and at least one suitable day.
export function parseBlueprintInput(body: unknown): ParseResult<BlueprintInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Mangler data' }
  const input = body as Record<string, unknown>

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 100) return { ok: false, error: 'Oppskriften må ha et navn (maks 100 tegn)' }

  const ingredients = formatIngredients(parseIngredients(typeof input.ingredients === 'string' ? input.ingredients : ''))
  if (!ingredients) return { ok: false, error: 'Oppskriften må ha minst én ingrediens' }

  if (!DISH_TYPE_OPTIONS.some(option => option.value === input.type)) {
    return { ok: false, error: 'Ugyldig type rett' }
  }

  const score = Number(input.score)
  if (!Number.isInteger(score) || score < 0 || score > 10) return { ok: false, error: 'Hyppighet må være et tall fra 0 til 10' }

  const validDays = new Set<string>(DAYS.map(day => day.value))
  const suitableDays = Array.isArray(input.suitableDays)
    ? DAYS.map(day => day.value).filter(day => (input.suitableDays as unknown[]).includes(day))
    : []
  if (suitableDays.length === 0 || (input.suitableDays as unknown[]).some(day => !validDays.has(String(day)))) {
    return { ok: false, error: 'Velg minst én passende dag' }
  }

  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 2000) : ''

  return {
    ok: true,
    value: {
      name,
      description: description || null,
      ingredients,
      type: input.type as DishType,
      score,
      suitableDays,
      steps: normalizeSteps(input.steps),
    },
  }
}

// A photo uploaded from the form: only real image types, and not too large
export function parseImageInput(image: unknown): ParseResult<{ base64: string; mimeType: string } | null> {
  if (image === undefined || image === null) return { ok: true, value: null }
  if (typeof image !== 'object') return { ok: false, error: 'Ugyldig bilde' }

  const { base64, mimeType } = image as { base64?: unknown; mimeType?: unknown }
  const safeType = safeImageMimeType(typeof mimeType === 'string' ? mimeType : '')
  if (typeof base64 !== 'string' || !base64 || !safeType) return { ok: false, error: 'Ugyldig bilde' }
  if (base64.length > MAX_IMAGE_BASE64_LENGTH) return { ok: false, error: 'Bildet er for stort (maks 2 MB)' }

  return { ok: true, value: { base64, mimeType: safeType } }
}
