import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { ShoppingListError, addListItem, readFamilyList, removeListItem, setItemQuantity, setItemsChecked } = await import('./family-shopping-list')

// Thursday 2026-10-01, noon in Norway; the week started Monday 2026-09-28
const NOW = new Date('2026-10-01T10:00:00.000Z')
const day = (key: string) => new Date(`${key}T00:00:00.000Z`)

interface Item {
  id: string
  shoppingListId: string
  name: string
  sources: string[]
  aisle: string
  quantity: number
  checked: boolean
  checkedAt: Date | null
  mealDate: Date | null
}

const item = (fields: Partial<Item> & { name: string }): Item => ({
  id: fields.name,
  shoppingListId: 'L',
  sources: ['Ekstra'],
  aisle: 'OTHER',
  quantity: 1,
  checked: false,
  checkedAt: null,
  mealDate: null,
  ...fields,
})

// A small in-memory stand-in for the parts of Prisma the list uses
function makeDb({
  items = [] as Item[],
  plans = [] as { date: Date; recipe: { name: string; ingredients: string } | null }[],
  known = [] as { nameKey: string; aisle: string }[],
} = {}) {
  let rows = [...items]
  let next = 0
  const matches = (row: Item, where: any): boolean =>
    (where.id === undefined || (typeof where.id === 'string' ? row.id === where.id : where.id.in.includes(row.id))) &&
    (where.shoppingListId === undefined || row.shoppingListId === where.shoppingListId) &&
    (where.checked === undefined || row.checked === where.checked) &&
    (where.mealDate === undefined || row.mealDate === where.mealDate) &&
    (where.checkedAt === undefined ||
      (where.checkedAt === null ? row.checkedAt === null : row.checkedAt !== null && row.checkedAt < where.checkedAt.lt))

  const db = {
    // The family has none of its own aisles
    familyAisle: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
    shoppingList: {
      upsert: vi.fn(async () => ({ id: 'L', familyId: 'f', items: rows.map(row => ({ ...row })) })),
    },
    shoppingListItem: {
      findMany: vi.fn(async () => rows.map(row => ({ ...row }))),
      create: vi.fn(async ({ data }: any) => {
        const row = item({ id: `new${next++}`, ...data })
        rows.push(row)
        return row
      }),
      createMany: vi.fn(async ({ data }: any) => {
        for (const fields of data) rows.push(item({ id: `new${next++}`, ...fields }))
        return { count: data.length }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = rows.find(r => r.id === where.id)!
        Object.assign(row, data)
        return { ...row }
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const hit = rows.filter(row => matches(row, where))
        hit.forEach(row => Object.assign(row, data))
        return { count: hit.length }
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        const before = rows.length
        rows = rows.filter(row => !matches(row, where))
        return { count: before - rows.length }
      }),
    },
    mealPlan: {
      findMany: vi.fn(async ({ where }: any) => plans.filter(plan => plan.recipe && plan.date >= where.date.gte)),
    },
    ingredient: {
      findMany: vi.fn(async () => known),
      createMany: vi.fn(async ({ data }: any) => ({ count: data.length })),
    },
  }
  return { db: db as never, rows: () => rows }
}

const taco = { name: 'Taco', ingredients: 'Kjøttdeig, Løk, Tacokrydder' }
const soup = { name: 'Suppe', ingredients: 'Løk, Gulrot' }

describe('readFamilyList', () => {
  it('puts the ingredients of dinners from today on the list, one row per dinner', async () => {
    const { db } = makeDb({
      plans: [
        { date: day('2026-10-01'), recipe: taco },
        { date: day('2026-10-03'), recipe: soup },
        { date: day('2026-09-29'), recipe: { name: 'Fisk', ingredients: 'Torsk' } },
      ],
      known: [{ nameKey: 'løk', aisle: 'PRODUCE' }],
    })
    const list = await readFamilyList('f', 'u', db, NOW)

    const names = list.items.map(row => `${row.name}@${row.mealDate?.toISOString().slice(0, 10)}`)
    expect(names.sort()).toEqual(['Gulrot@2026-10-03', 'Kjøttdeig@2026-10-01', 'Løk@2026-10-01', 'Løk@2026-10-03', 'Tacokrydder@2026-10-01'])
    expect(list.items.find(row => row.name === 'Løk')).toMatchObject({ aisle: 'PRODUCE', checked: false })
    expect(list.items.find(row => row.name === 'Gulrot')).toMatchObject({ sources: ['Suppe'] })
  })

  it('does not add a row twice when it is read again', async () => {
    const { db, rows } = makeDb({ plans: [{ date: day('2026-10-02'), recipe: soup }] })
    await readFamilyList('f', 'u', db, NOW)
    await readFamilyList('f', 'u', db, NOW)
    expect(rows()).toHaveLength(2)
  })

  it('keeps a checked recipe row, and does not bring it back unchecked', async () => {
    const { db, rows } = makeDb({
      items: [item({ name: 'Løk', mealDate: day('2026-10-02'), sources: ['Suppe'], checked: true, checkedAt: day('2026-09-30') })],
      plans: [{ date: day('2026-10-02'), recipe: soup }],
    })
    await readFamilyList('f', 'u', db, NOW)
    expect(rows().filter(row => row.name === 'Løk')).toMatchObject([{ checked: true }])
  })

  it('takes off unchecked rows for past dinners and for dinners that were changed or removed', async () => {
    const { db, rows } = makeDb({
      items: [
        item({ name: 'Torsk', mealDate: day('2026-09-29'), sources: ['Fisk'] }),
        item({ name: 'Pasta', mealDate: day('2026-10-02'), sources: ['Pasta'] }),
        item({ name: 'Melk' }),
      ],
      plans: [{ date: day('2026-10-02'), recipe: soup }],
    })
    await readFamilyList('f', 'u', db, NOW)
    expect(rows().map(row => row.name).sort()).toEqual(['Gulrot', 'Løk', 'Melk'])
  })

  it('forgets items checked off before this week, and shows those checked this week', async () => {
    const { db } = makeDb({
      items: [
        item({ name: 'Brød', checked: true, checkedAt: day('2026-09-27') }),
        item({ name: 'Melk', checked: true, checkedAt: day('2026-09-28') }),
        item({ name: 'Egg', checked: true, checkedAt: null }),
      ],
    })
    const list = await readFamilyList('f', 'u', db, NOW)
    expect(list.items.map(row => row.name).sort()).toEqual(['Egg', 'Melk'])
    // an item checked before the time was recorded counts as checked now
    expect(list.items.find(row => row.name === 'Egg')!.checkedAt).toEqual(NOW)
  })
})

describe('addListItem', () => {
  it('adds a new item by hand, in the aisle the family uses for it', async () => {
    const { db } = makeDb({ known: [{ nameKey: 'melk', aisle: 'DRY' }] })
    expect(await addListItem('f', 'u', '  Melk ', db)).toMatchObject({ name: 'Melk', aisle: 'DRY', sources: ['Ekstra'], mealDate: null })
  })

  it('uses the given aisle for a new name, but the family shelf for a known one', async () => {
    expect(await addListItem('f', 'u', 'Gulrøtter', makeDb().db, 'OTHER')).toMatchObject({ aisle: 'OTHER' })
    expect(await addListItem('f', 'u', 'Melk', makeDb({ known: [{ nameKey: 'melk', aisle: 'CHILLED' }] }).db, 'OTHER')).toMatchObject({ aisle: 'CHILLED' })
    await expect(addListItem('f', 'u', 'Melk', makeDb().db, 'MOON')).rejects.toMatchObject({ status: 400 })
  })

  it('guesses the aisle for an unknown item', async () => {
    expect(await addListItem('f', 'u', 'Gulrøtter', makeDb().db)).toMatchObject({ aisle: 'PRODUCE' })
  })

  it('adds one more of an item already added by hand, and puts a checked one back as one', async () => {
    const open = makeDb({ items: [item({ name: 'Melk', quantity: 2 })] })
    expect(await addListItem('f', 'u', 'melk', open.db)).toMatchObject({ id: 'Melk', quantity: 3 })
    expect(open.rows()).toHaveLength(1)

    const bought = makeDb({ items: [item({ name: 'Melk', checked: true, checkedAt: NOW, quantity: 4 })] })
    expect(await addListItem('f', 'u', 'melk', bought.db)).toMatchObject({ id: 'Melk', checked: false, checkedAt: null, quantity: 1 })
    expect(bought.rows()).toHaveLength(1)
  })

  it('adds one by hand next to an ingredient that is there for a dinner', async () => {
    const { db, rows } = makeDb({ items: [item({ name: 'Løk', mealDate: day('2026-10-02') })] })
    expect(await addListItem('f', 'u', 'Løk', db)).toMatchObject({ name: 'Løk', mealDate: null, sources: ['Ekstra'] })
    expect(rows()).toHaveLength(2)
  })

  it('refuses empty and too long names', async () => {
    await expect(addListItem('f', 'u', '  ', makeDb().db)).rejects.toBeInstanceOf(ShoppingListError)
    await expect(addListItem('f', 'u', 'x'.repeat(101), makeDb().db)).rejects.toMatchObject({ status: 400 })
  })
})

describe('setItemsChecked', () => {
  it('checks off every row of a line and records when', async () => {
    const { db, rows } = makeDb({ items: [item({ name: 'a' }), item({ name: 'b' }), item({ name: 'c' })] })
    await setItemsChecked('f', ['a', 'b'], true, db, NOW)
    expect(rows().map(row => [row.id, row.checked, row.checkedAt])).toEqual([
      ['a', true, NOW],
      ['b', true, NOW],
      ['c', false, null],
    ])
    await setItemsChecked('f', ['a'], false, db, NOW)
    expect(rows()[0]).toMatchObject({ checked: false, checkedAt: null })
  })

  it('refuses a bad request and unknown items', async () => {
    await expect(setItemsChecked('f', [], true, makeDb().db)).rejects.toMatchObject({ status: 400 })
    await expect(setItemsChecked('f', ['a'], 'yes', makeDb().db)).rejects.toMatchObject({ status: 400 })
    await expect(setItemsChecked('f', ['nope'], true, makeDb().db)).rejects.toMatchObject({ status: 404 })
  })
})

describe('setItemQuantity', () => {
  it('sets how many of an item added by hand, but not of a recipe item', async () => {
    const { db, rows } = makeDb({ items: [item({ name: 'Melk' }), item({ name: 'Løk', mealDate: day('2026-10-02') })] })
    await setItemQuantity('f', 'Melk', 3, db)
    expect(rows().find(row => row.name === 'Melk')!.quantity).toBe(3)
    await expect(setItemQuantity('f', 'Løk', 2, db)).rejects.toMatchObject({ status: 404 })
  })

  it('refuses a quantity that is not a whole number from 1 to 99', async () => {
    const { db } = makeDb({ items: [item({ name: 'Melk' })] })
    for (const bad of [0, 1.5, 100, '2', undefined]) {
      await expect(setItemQuantity('f', 'Melk', bad, db)).rejects.toMatchObject({ status: 400 })
    }
  })
})

describe('removeListItem', () => {
  it('removes an item added by hand, but not a recipe item', async () => {
    const { db, rows } = makeDb({ items: [item({ name: 'Melk' }), item({ name: 'Løk', mealDate: day('2026-10-02') })] })
    await removeListItem('f', 'Melk', db)
    await expect(removeListItem('f', 'Løk', db)).rejects.toMatchObject({ status: 404 })
    expect(rows().map(row => row.name)).toEqual(['Løk'])
  })
})
