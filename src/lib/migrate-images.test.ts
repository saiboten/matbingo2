import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { migrateImages } = await import('./migrate-images')

const LINK = (n: string) => `https://s.public.blob.vercel-storage.com/x/photo-${n}.png`

type Table = Record<string, { imageUrl: string | null; hasImage: boolean }>

// A small stand-in for the tables: owners with or without a link, and their base64 rows
function makeDb() {
  const recipes: Table = {
    r1: { imageUrl: null, hasImage: true },
    r2: { imageUrl: LINK('done'), hasImage: true },
    r3: { imageUrl: null, hasImage: false },
    r4: { imageUrl: null, hasImage: true }
  }
  const blueprints: Table = { b1: { imageUrl: null, hasImage: true } }
  const owners = (table: Table) =>
    vi.fn(async () => Object.entries(table).filter(([, v]) => v.imageUrl === null && v.hasImage).map(([id]) => ({ id })))
  const update = (table: Table) =>
    vi.fn(async ({ where, data }: any) => {
      table[where.id].imageUrl = data.imageUrl
      return { id: where.id }
    })
  const image = vi.fn(async () => ({ base64: Buffer.from('12345678').toString('base64'), mimeType: 'image/png' }))
  const raw = {
    recipe: { findMany: owners(recipes), update: update(recipes) },
    blueprint: { findMany: owners(blueprints), update: update(blueprints) },
    recipeImage: { findUnique: image },
    blueprintImage: { findUnique: image }
  }
  return { db: raw as never, recipes, blueprints, raw }
}

function makeClient(failSecond?: string) {
  let n = 0
  return {
    put: vi.fn(async () => {
      const call = n++
      if (failSecond && call === 1) throw new Error(failSecond)
      return { url: LINK(String(call)) }
    }),
    del: vi.fn(),
    copy: vi.fn()
  }
}

describe('migrateImages', () => {
  it('moves photos that have no link yet, and saves the links', async () => {
    const { db, recipes, blueprints } = makeDb()
    const report = await migrateImages({ db, client: makeClient() })

    expect(report.recipes).toMatchObject({ pending: 2, moved: 2, failed: [] })
    expect(report.blueprints).toMatchObject({ pending: 1, moved: 1 })
    expect(recipes.r1.imageUrl).toMatch(/^https:\/\//)
    expect(recipes.r4.imageUrl).toMatch(/^https:\/\//)
    expect(recipes.r2.imageUrl).toBe(LINK('done'))
    expect(recipes.r3.imageUrl).toBeNull()
    expect(blueprints.b1.imageUrl).toMatch(/^https:\/\//)
  })

  it('is safe to run again: nothing left to move the second time', async () => {
    const { db } = makeDb()
    await migrateImages({ db, client: makeClient() })
    const client = makeClient()
    const again = await migrateImages({ db, client })
    expect(again.recipes.pending + again.blueprints.pending).toBe(0)
    expect(client.put).not.toHaveBeenCalled()
  })

  it('a dry run reports what it would do and changes nothing', async () => {
    const { db, recipes, raw } = makeDb()
    const client = makeClient()
    const report = await migrateImages({ db, client, dryRun: true })

    expect(report.recipes.pending).toBe(2)
    expect(report.bytes).toBe(27)
    expect(client.put).not.toHaveBeenCalled()
    expect(raw.recipe.update).not.toHaveBeenCalled()
    expect(recipes.r1.imageUrl).toBeNull()
  })

  it('reports a failed photo and keeps going with the rest', async () => {
    const { db, recipes } = makeDb()
    const report = await migrateImages({ db, client: makeClient('upload failed') })

    expect(report.recipes.failed).toEqual([{ id: 'r4', error: 'upload failed' }])
    expect(report.recipes.moved).toBe(1)
    expect(recipes.r4.imageUrl).toBeNull()
    expect(report.blueprints.moved).toBe(1)
  })
})
