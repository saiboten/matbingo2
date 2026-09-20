// Recipe photos live in the database as base64. They are served from their own endpoint so that
// lists of recipes don't carry image data: an <img> asks for exactly the photos that are shown,
// and the browser/CDN cache keeps them from hitting the database again.

// Only real image types are served as such; anything else could be scripted content
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export function safeImageMimeType(mimeType: string | null | undefined): string | null {
  const normalized = (mimeType ?? '').trim().toLowerCase()
  return ALLOWED_IMAGE_TYPES.has(normalized) ? normalized : null
}

// URL of a recipe's photo, or null if it has none. `updatedAt` is part of the URL, so a changed
// photo gets a new address and the old one can be cached for as long as anyone wants.
export function recipeImageUrl(recipe: {
  id: string
  updatedAt: Date | string
  image?: { id: string } | null
}): string | null {
  if (!recipe.image) return null
  return `/api/recipe-image/${recipe.id}?v=${new Date(recipe.updatedAt).getTime()}`
}
