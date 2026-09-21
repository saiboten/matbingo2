import { describe, expect, it, vi } from 'vitest'
import { BLUEPRINT_SEEDS } from '../data/blueprint-recipes'
import { blueprintImageUrl, blueprintRecipeData, matchAddedBlueprints, toBlueprint } from './blueprints'
import { normalizeSteps } from './recipe-steps'
import { parseIngredients } from './ingredient-text'

vi.mock('./prisma', () => ({ prisma: {} }))
const { BlueprintError, addBlueprintToFamily } = await import('./add-blueprint')
const { ensureBlueprintsSeeded, listBlueprints } = await import('./blueprint-store')

describe('the built-in blueprints (the library\'s starting content)', () => {
  it('are ten recipes with unique ids and names', () => {
    expect(BLUEPRINT_SEEDS).toHaveLength(10)
    expect(new Set(BLUEPRINT_SEEDS.map(b => b.id)).size).toBe(10)
    expect(new Set(BLUEPRINT_SEEDS.map(b => b.name.toLowerCase())).size).toBe(10)
  })

  it.each(BLUEPRINT_SEEDS.map(b => [b.name, b] as const))('%s is complete and fits the recipe limits', (_name, seed) => {
    expect(['MEAT', 'FISH', 'VEGAN', 'OTHER']).toContain(seed.type)
    expect(seed.score).toBeGreaterThanOrEqual(0)
    expect(seed.score).toBeLessThanOrEqual(10)
    expect(seed.description.trim()).not.toBe('')
    expect(parseIngredients(seed.ingredients).length).toBeGreaterThanOrEqual(2)
    expect(seed.steps.length).toBeGreaterThanOrEqual(3)
    // nothing would be trimmed or dropped when the steps are saved
    expect(normalizeSteps(seed.steps.map(([title, text]) => ({ title, text })))).toHaveLength(seed.steps.length)
  })
})

const row = {
  id: 'pannekaker',
  name: 'Pannekaker',
  description: 'Tynne pannekaker',
  ingredients: 'Mel, Egg, Melk',
  type: 'OTHER' as const,
  score: 4,
  suitableDays: ['SATURDAY', 'SUNDAY'] as ('SATURDAY' | 'SUNDAY')[],
  position: 3,
  updatedAt: new Date('2026-09-20T10:00:00.000Z'),
  steps: [
    { position: 1, title: 'Lag røren', text: 'Visp mel og egg.' },
    { position: 2, title: null, text: 'Stek pannekakene.' },
  ],
}

describe('toBlueprint', () => {
  it('turns a database row into the shape the app uses', () => {
    const blueprint = toBlueprint({ ...row, image: { id: 'i1' } })
    expect(blueprint).toMatchObject({ id: 'pannekaker', hasImage: true, updatedAt: '2026-09-20T10:00:00.000Z' })
    expect(toBlueprint({ ...row, image: null }).hasImage).toBe(false)
  })
})

describe('blueprintImageUrl', () => {
  it('is null without a photo, and versioned with one', () => {
    const blueprint = toBlueprint({ ...row, image: { id: 'i1' } })
    expect(blueprintImageUrl({ ...blueprint, hasImage: false })).toBeNull()
    expect(blueprintImageUrl(blueprint)).toBe(`/api/blueprint-image/pannekaker?v=${new Date(row.updatedAt).getTime()}`)
  })
})

describe('blueprint photos in Blob', () => {
  const link = 'https://abc.public.blob.vercel-storage.com/blueprints/photo-x1.jpg'

  it('uses the Blob link, also when there is no old base64 copy', () => {
    const blueprint = toBlueprint({ ...row, image: null, imageUrl: link })
    expect(blueprint).toMatchObject({ hasImage: true, imageUrl: link })
    expect(blueprintImageUrl(blueprint)).toBe(link)
  })
})

describe('matchAddedBlueprints', () => {
  it('matches by recipe name, ignoring case and spacing', () => {
    const added = matchAddedBlueprints(
      [{ id: 'pannekaker', name: 'Pannekaker' }, { id: 'lasagne', name: 'Lasagne' }],
      [{ id: 'r1', name: ' pannekaker ' }, { id: 'r2', name: 'Noe helt annet' }]
    )
    expect(added).toEqual({ pannekaker: 'r1' })
  })
})

describe('blueprintRecipeData', () => {
  it('numbers the steps and keeps the days', () => {
    const data = blueprintRecipeData(toBlueprint({ ...row, image: null }))
    expect(data.suitableDays).toEqual(['SATURDAY', 'SUNDAY'])
    expect(data.steps.map(step => step.position)).toEqual([1, 2])
  })

  it('falls back to every day when a blueprint has none', () => {
    expect(blueprintRecipeData(toBlueprint({ ...row, suitableDays: [], image: null })).suitableDays).toHaveLength(7)
  })
})

describe('ensureBlueprintsSeeded', () => {
  const makeDb = (existing: number) => {
    const count = vi.fn().mockResolvedValue(existing)
    const createBlueprints = vi.fn().mockResolvedValue({ count: 10 })
    const createSteps = vi.fn().mockResolvedValue({ count: 0 })
    return {
      db: { blueprint: { count, createMany: createBlueprints }, blueprintStep: { createMany: createSteps } } as never,
      createBlueprints,
      createSteps,
    }
  }

  it('fills an empty library with the built-in blueprints and their steps', async () => {
    const { db, createBlueprints, createSteps } = makeDb(0)
    await ensureBlueprintsSeeded(db)

    expect(createBlueprints.mock.calls[0][0].data).toHaveLength(10)
    expect(createBlueprints.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(createSteps.mock.calls[0][0].data.length).toBe(BLUEPRINT_SEEDS.reduce((sum, seed) => sum + seed.steps.length, 0))
  })

  it('leaves an existing library alone', async () => {
    const { db, createBlueprints, createSteps } = makeDb(3)
    await ensureBlueprintsSeeded(db)
    expect(createBlueprints).not.toHaveBeenCalled()
    expect(createSteps).not.toHaveBeenCalled()
  })
})

describe('listBlueprints', () => {
  it('returns the blueprints in order, as app objects', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ...row, image: null }])
    const db = { blueprint: { count: vi.fn().mockResolvedValue(1), findMany }, blueprintStep: {} } as never

    const list = await listBlueprints(db)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'pannekaker', hasImage: false })
    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ position: 'asc' }, { name: 'asc' }])
  })
})

describe('addBlueprintToFamily', () => {
  const makeDb = (existing: { id: string; name: string }[] = [], withImage = false) => {
    const create = vi.fn().mockResolvedValue({ id: 'new-recipe' })
    const findMany = vi.fn().mockResolvedValue(existing)
    const findUnique = vi
      .fn()
      .mockResolvedValue({ ...row, image: withImage ? { id: 'i1', base64: 'AAAA', mimeType: 'image/png' } : null })
    return { db: { recipe: { findMany, create }, blueprint: { findUnique } } as never, create }
  }
  const input = { blueprintId: 'pannekaker', familyId: 'fam', userId: 'usr' }

  it('copies the recipe with its steps into the family', async () => {
    const { db, create } = makeDb()
    await expect(addBlueprintToFamily(input, db)).resolves.toEqual({ id: 'new-recipe' })

    const data = create.mock.calls[0][0].data
    expect(data).toMatchObject({ name: 'Pannekaker', familyId: 'fam', createdById: 'usr', score: 4 })
    expect(data.steps.create).toEqual([
      { position: 1, title: 'Lag røren', text: 'Visp mel og egg.' },
      { position: 2, title: null, text: 'Stek pannekakene.' },
    ])
    expect(data.imageUrl).toBeUndefined()
  })

  const blob = () => ({
    put: vi.fn().mockResolvedValue({ url: 'https://s.public.blob.vercel-storage.com/recipes/photo-new.png' }),
    del: vi.fn(),
    copy: vi.fn().mockResolvedValue({ url: 'https://s.public.blob.vercel-storage.com/recipes/photo-copy.png' })
  })

  it("uploads a photo that only exists as base64 for the family's copy", async () => {
    const { db, create } = makeDb([], true)
    const client = blob()
    await addBlueprintToFamily(input, db, client)
    expect(create.mock.calls[0][0].data.imageUrl).toBe('https://s.public.blob.vercel-storage.com/recipes/photo-new.png')
    expect(client.put).toHaveBeenCalledTimes(1)
  })

  it('gives the family its own copy of a photo already in Blob', async () => {
    const link = 'https://s.public.blob.vercel-storage.com/blueprints/photo-lib.png'
    const findUnique = vi.fn().mockResolvedValue({ ...row, image: null, imageUrl: link })
    const create = vi.fn().mockResolvedValue({ id: 'new-recipe' })
    const db = { recipe: { findMany: vi.fn().mockResolvedValue([]), create }, blueprint: { findUnique } } as never
    const client = blob()
    await addBlueprintToFamily(input, db, client)
    expect(client.copy).toHaveBeenCalledWith(link, 'recipes/photo.png', expect.anything())
    expect(create.mock.calls[0][0].data.imageUrl).toBe('https://s.public.blob.vercel-storage.com/recipes/photo-copy.png')
  })

  it('does not add the same recipe twice', async () => {
    const { db, create } = makeDb([{ id: 'mine', name: 'Pannekaker' }])
    await expect(addBlueprintToFamily(input, db)).rejects.toMatchObject({ status: 409, recipeId: 'mine' })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an unknown blueprint', async () => {
    const db = { recipe: {}, blueprint: { findUnique: vi.fn().mockResolvedValue(null) } } as never
    await expect(addBlueprintToFamily({ ...input, blueprintId: 'nope' }, db)).rejects.toBeInstanceOf(BlueprintError)
  })
})
