import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.fn()

vi.mock('./prisma', () => ({
  prisma: {
    recipe: { findMany },
    eatenLog: { findMany: vi.fn().mockResolvedValue([]) }
  }
}))

const { selectOptimalRecipe } = await import('./algorithm')

describe('selectOptimalRecipe', () => {
  beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
  })

  it('never suggests recipes that are hibernating', async () => {
    await selectOptimalRecipe('family-1', new Date('2026-09-21T00:00:00Z'))

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      familyId: 'family-1',
      hibernating: false
    })
  })
})
