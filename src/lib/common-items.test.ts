import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { CommonItemError, addCommonItem, changeCommonItemAisle, ensureCommonItems, listCommonItems, removeCommonItem } = await import('./common-items')

// A small in-memory stand-in for the two tables the module uses
function makeDb(options: { seeded?: boolean; ingredients?: Record<string, unknown>[] } = {}) {
  const family = { commonItemsSeeded: options.seeded ?? false }
  const rows: Record<string, any>[] = (options.ingredients ?? []).map((row, i) => ({ id: `i${i}`, familyId: 'fam', common: false, ...row }))
  let next = 100
  const matches = (row: any, where: any) =>
    (!where.familyId || row.familyId === where.familyId) &&
    (!where.id || row.id === where.id) &&
    (where.common === undefined || row.common === where.common) &&
    (!where.nameKey?.in || where.nameKey.in.includes(row.nameKey))
  const db = {
    family: {
      updateMany: vi.fn(async ({ data }: any) => {
        if (family.commonItemsSeeded) return { count: 0 }
        Object.assign(family, data)
        return { count: 1 }
      }),
    },
    ingredient: {
      findMany: vi.fn(async ({ where }: any) => rows.filter(row => matches(row, where)).sort((a, b) => a.name.localeCompare(b.name))),
      findUnique: vi.fn(async ({ where }: any) => rows.find(row => row.nameKey === where.familyId_nameKey.nameKey) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => rows.find(row => row.id === where.id)),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const hit = rows.filter(row => matches(row, where))
        hit.forEach(row => Object.assign(row, data))
        return { count: hit.length }
      }),
      update: vi.fn(async ({ where, data }: any) => Object.assign(rows.find(row => row.id === where.id)!, data)),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `i${next++}`, ...data }
        rows.push(row)
        return row
      }),
      createMany: vi.fn(async ({ data }: any) => {
        data.forEach((row: any) => rows.push({ id: `i${next++}`, ...row }))
        return { count: data.length }
      }),
    },
  }
  return { db: db as never, rows, family }
}

describe('a family\'s common items', () => {
  it('gets the default set the first time, and only then', async () => {
    const { db, rows } = makeDb()
    const first = await listCommonItems('fam', db)
    expect(first.map(item => item.name)).toContain('Melk')
    expect(first.find(item => item.name === 'Melk')?.aisle).toBe('CHILLED')

    const count = rows.length
    await listCommonItems('fam', db)
    expect(rows.length).toBe(count)
  })

  it('keeps the aisle a family already chose for an ingredient it knows', async () => {
    const { db, rows } = makeDb({ ingredients: [{ name: 'Melk', nameKey: 'melk', aisle: 'DRY' }] })
    await ensureCommonItems('fam', db)
    expect(rows.filter(row => row.nameKey === 'melk')).toEqual([expect.objectContaining({ aisle: 'DRY', common: true })])
  })

  it('does not seed again once seeded, so removed items stay removed', async () => {
    const { db } = makeDb({ seeded: true, ingredients: [{ name: 'Melk', nameKey: 'melk', aisle: 'CHILLED', common: true }] })
    expect((await listCommonItems('fam', db)).map(item => item.name)).toEqual(['Melk'])
  })

  it("never shows another family's items", async () => {
    const { db } = makeDb({ seeded: true, ingredients: [{ familyId: 'other', name: 'Hemmelig', nameKey: 'hemmelig', common: true }] })
    expect(await listCommonItems('fam', db)).toEqual([])
  })
})

describe('adding', () => {
  it('adds a new item with a guessed aisle, or the chosen one', async () => {
    const { db } = makeDb({ seeded: true })
    expect(await addCommonItem('fam', { name: '  Gulrøtter ' }, db)).toMatchObject({ name: 'Gulrøtter', aisle: 'PRODUCE' })
    expect(await addCommonItem('fam', { name: 'Batterier', aisle: 'OTHER' }, db)).toMatchObject({ name: 'Batterier', aisle: 'OTHER' })
  })

  it('reuses an ingredient the family already has, keeping its aisle unless one is given', async () => {
    const { db, rows } = makeDb({ seeded: true, ingredients: [{ name: 'Kanel', nameKey: 'kanel', aisle: 'DRY' }] })
    expect(await addCommonItem('fam', { name: 'kanel' }, db)).toMatchObject({ name: 'Kanel', aisle: 'DRY' })
    expect(rows).toHaveLength(1)
  })

  it('refuses duplicates, empty names and unknown aisles', async () => {
    const { db } = makeDb({ seeded: true, ingredients: [{ name: 'Melk', nameKey: 'melk', common: true }] })
    await expect(addCommonItem('fam', { name: 'MELK' }, db)).rejects.toMatchObject({ status: 409 })
    await expect(addCommonItem('fam', { name: '  ' }, db)).rejects.toMatchObject({ status: 400 })
    await expect(addCommonItem('fam', { name: 'X', aisle: 'MOON' }, db)).rejects.toBeInstanceOf(CommonItemError)
  })
})

describe('changing the aisle and removing', () => {
  it('changes the aisle of an item of the family', async () => {
    const { db, rows } = makeDb({ seeded: true, ingredients: [{ name: 'Melk', nameKey: 'melk', aisle: 'CHILLED', common: true }] })
    expect(await changeCommonItemAisle('fam', 'i0', 'DRY', db)).toMatchObject({ aisle: 'DRY' })
    expect(rows[0].aisle).toBe('DRY')
    await expect(changeCommonItemAisle('fam', 'i0', 'MOON', db)).rejects.toMatchObject({ status: 400 })
  })

  it("cannot touch another family's item", async () => {
    const { db, rows } = makeDb({ seeded: true, ingredients: [{ name: 'Melk', nameKey: 'melk', aisle: 'CHILLED', common: true }] })
    await expect(changeCommonItemAisle('other', 'i0', 'DRY', db)).rejects.toMatchObject({ status: 404 })
    await expect(removeCommonItem('other', 'i0', db)).rejects.toMatchObject({ status: 404 })
    expect(rows[0]).toMatchObject({ aisle: 'CHILLED', common: true })
  })

  it('removes an item from the list but keeps the ingredient', async () => {
    const { db, rows } = makeDb({ seeded: true, ingredients: [{ name: 'Melk', nameKey: 'melk', aisle: 'CHILLED', common: true }] })
    await removeCommonItem('fam', 'i0', db)
    expect(rows[0]).toMatchObject({ common: false, aisle: 'CHILLED' })
    expect(await listCommonItems('fam', db)).toEqual([])
  })
})
