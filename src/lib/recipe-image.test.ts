import { describe, expect, it } from 'vitest'
import { recipeImageUrl, safeImageMimeType } from './recipe-image'

describe('recipeImageUrl', () => {
  const updatedAt = '2026-09-18T10:00:00.000Z'

  it('is null when the recipe has no image', () => {
    expect(recipeImageUrl({ id: 'r1', updatedAt })).toBeNull()
    expect(recipeImageUrl({ id: 'r1', updatedAt, image: null })).toBeNull()
  })

  it('points at the image endpoint and changes when the recipe is updated', () => {
    const first = recipeImageUrl({ id: 'r1', updatedAt, image: { id: 'i1' } })
    const later = recipeImageUrl({ id: 'r1', updatedAt: '2026-09-19T10:00:00.000Z', image: { id: 'i1' } })
    expect(first).toBe(`/api/recipe-image/r1?v=${new Date(updatedAt).getTime()}`)
    expect(later).not.toBe(first)
  })
})

describe('safeImageMimeType', () => {
  it('allows common image types, ignoring case', () => {
    expect(safeImageMimeType('image/jpeg')).toBe('image/jpeg')
    expect(safeImageMimeType(' IMAGE/PNG ')).toBe('image/png')
  })

  it('rejects anything that could be executed as a page', () => {
    expect(safeImageMimeType('text/html')).toBeNull()
    expect(safeImageMimeType('image/svg+xml')).toBeNull()
    expect(safeImageMimeType('')).toBeNull()
    expect(safeImageMimeType(undefined)).toBeNull()
  })
})
