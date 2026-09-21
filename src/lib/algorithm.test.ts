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

describe('selectOptimalRecipe ranking', () => {
  const recipe = (id: string, eatenDaysAgo: number | null) => ({
    id,
    score: 7,
    type: 'MEAT',
    eatenLogs: eatenDaysAgo === null ? [] : [{ date: new Date(Date.UTC(2026, 8, 21 - eatenDaysAgo)) }]
  })

  it('still suggests the only matching recipe when it was eaten recently', async () => {
    findMany.mockReset()
    findMany.mockResolvedValue([recipe('agurk', 1)])
    const result = await selectOptimalRecipe('family-1', new Date('2026-09-21T00:00:00Z'), [], { ingredients: ['Agurk'] })
    expect(result?.id).toBe('agurk')
  })

  it('prefers a recipe that was not eaten recently', async () => {
    findMany.mockReset()
    findMany.mockResolvedValue([recipe('recent', 1), recipe('old', 40)])
    expect((await selectOptimalRecipe('family-1', new Date('2026-09-21T00:00:00Z')))?.id).toBe('old')
  })

  it('asks the database to leave out frequency 0 recipes, and gives nothing when none match', async () => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
    expect(await selectOptimalRecipe('family-1', new Date('2026-09-21T00:00:00Z'))).toBeNull()
    expect(findMany.mock.calls[0][0].where.score).toEqual({ gt: 0 })
  })
})
