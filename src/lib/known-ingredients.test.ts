import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { listKnownIngredients } = await import('./known-ingredients')

describe('listKnownIngredients', () => {
  it('combines saved ingredients and recipe ingredients, once each, with the saved shelf winning', async () => {
    const db = {
      ingredient: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ name: 'Melk', nameKey: 'melk' }])
          .mockResolvedValueOnce([{ nameKey: 'melk', aisle: 'DRY' }]),
        createMany: vi.fn()
      },
      recipe: { findMany: vi.fn().mockResolvedValue([{ ingredients: 'Løk, melk,  Agurk' }, { ingredients: 'Løk' }]) }
    } as never

    const result = await listKnownIngredients('fam', db)
    expect(result).toEqual([
      { name: 'Agurk', aisle: 'PRODUCE' },
      { name: 'Løk', aisle: 'PRODUCE' },
      { name: 'Melk', aisle: 'DRY' }
    ])
    expect((db as never as { ingredient: { createMany: unknown } }).ingredient.createMany).not.toHaveBeenCalled()
  })
})
