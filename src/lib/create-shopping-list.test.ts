import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { ShoppingListError, createShoppingList, parseDays, previewShoppingItems } = await import('./create-shopping-list')

const D1 = new Date('2026-09-14T00:00:00.000Z')
const D2 = new Date('2026-09-15T00:00:00.000Z')

// A fake database: two planned recipes that share Løk, and an aisle the family has chosen for Melk
function makeDb(options: { plans?: unknown[]; ingredients?: { nameKey: string; aisle: string }[] } = {}) {
  const plans = options.plans ?? [
    { date: D1, recipe: { name: 'Taco', ingredients: 'Kjøttdeig, Løk' } },
    { date: D2, recipe: { name: 'Suppe', ingredients: 'Løk, Gulrot' } },
  ]
  const created = vi.fn().mockResolvedValue({ id: 'list-1', items: [] })
  const db = {
    mealPlan: { findMany: vi.fn().mockResolvedValue(plans) },
    ingredient: {
      findMany: vi.fn().mockResolvedValue(options.ingredients ?? []),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    shoppingList: { create: created },
  } as never
  return { db, created }
}

describe('parseDays', () => {
  it('reads calendar days and ISO dates as UTC midnight, once each', () => {
    expect(parseDays(['2026-09-14', '2026-09-14T00:00:00.000Z', '2026-09-15'])).toEqual([D1, D2])
  })

  it('ignores anything else', () => {
    expect(parseDays('2026-09-14')).toEqual([])
    expect(parseDays(['nope', 5, null, '14.09.2026'])).toEqual([])
  })
})

describe('previewShoppingItems', () => {
  it('shows what the recipes contribute, merged and sorted, without writing anything', async () => {
    const { db } = makeDb()
    const result = await previewShoppingItems({ familyId: 'fam', days: ['2026-09-14', '2026-09-15'] }, db)

    expect(result.recipeCount).toBe(2)
    expect(result.items.map(item => item.name).sort()).toEqual(['Gulrot', 'Kjøttdeig', 'Løk'])
    expect(result.items.find(item => item.name === 'Løk')?.sources).toEqual(['Taco', 'Suppe'])
    expect((db as never as { ingredient: { createMany: ReturnType<typeof vi.fn> } }).ingredient.createMany).not.toHaveBeenCalled()
  })

  it('is empty when no days are given', async () => {
    const { db } = makeDb()
    expect(await previewShoppingItems({ familyId: 'fam', days: [] }, db)).toEqual({ items: [], recipeCount: 0 })
  })
})

describe('createShoppingList', () => {
  it('adds extras after the recipe items, marked as extra, and skips ones already on the list', async () => {
    const { db, created } = makeDb()
    await createShoppingList(
      {
        familyId: 'fam',
        userId: 'usr',
        days: ['2026-09-14', '2026-09-15'],
        extras: [{ name: 'Melk', aisle: 'CHILLED' }, { name: 'løk' }, { name: 'Toalettpapir', aisle: 'OTHER' }],
      },
      db
    )

    const data = created.mock.calls[0][0].data
    expect(data).toMatchObject({ familyId: 'fam', createdById: 'usr', dates: [D1, D2] })
    const items: { name: string; sources: string[]; aisle: string }[] = data.items.create
    expect(items.map(item => item.name).sort()).toEqual(['Gulrot', 'Kjøttdeig', 'Melk', 'Løk', 'Toalettpapir'].sort())
    expect(items.find(item => item.name === 'Melk')).toMatchObject({ sources: ['Ekstra'], aisle: 'CHILLED' })
    expect(items.find(item => item.name === 'Løk')?.sources).toEqual(['Taco', 'Suppe'])
  })

  it('sorts the list by aisle: groceries first, then chilled, then other', async () => {
    const { db, created } = makeDb()
    await createShoppingList(
      { familyId: 'fam', userId: 'usr', days: ['2026-09-14'], extras: [{ name: 'Toalettpapir', aisle: 'OTHER' }, { name: 'Melk', aisle: 'CHILLED' }] },
      db
    )
    const aisles = created.mock.calls[0][0].data.items.create.map((item: { aisle: string }) => item.aisle)
    const order = ['PRODUCE', 'MEAT', 'FISH', 'FROZEN', 'CHILLED', 'COLD_CUTS', 'BAKERY', 'DRY', 'OTHER']
    expect(aisles).toEqual([...aisles].sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b)))
  })

  it("uses the family's own aisle for an item over the catalogue's, and guesses for free text", async () => {
    const { db, created } = makeDb({ ingredients: [{ nameKey: 'melk', aisle: 'DRY' }] })
    await createShoppingList(
      { familyId: 'fam', userId: 'usr', days: [], extras: [{ name: 'Melk', aisle: 'CHILLED' }, { name: 'Gulrot' }, { name: 'Noe rart' }] },
      db
    )
    const byName = Object.fromEntries(created.mock.calls[0][0].data.items.create.map((item: { name: string; aisle: string }) => [item.name, item.aisle]))
    expect(byName).toEqual({ Melk: 'DRY', Gulrot: 'PRODUCE', 'Noe rart': 'OTHER' })
  })

  it('works with extras only, and with no days', async () => {
    const { db, created } = makeDb({ plans: [] })
    await createShoppingList({ familyId: 'fam', userId: 'usr', days: [], extras: [{ name: 'Melk' }] }, db)
    expect(created.mock.calls[0][0].data.dates).toEqual([])
  })

  it('refuses a list with nothing on it, with a fitting message', async () => {
    const { db } = makeDb({ plans: [] })
    await expect(createShoppingList({ familyId: 'fam', userId: 'usr', days: ['2026-09-14'], extras: [] }, db)).rejects.toMatchObject({
      status: 400,
      message: 'Ingen oppskrifter på de valgte dagene',
    })
    await expect(createShoppingList({ familyId: 'fam', userId: 'usr', days: [], extras: [] }, db)).rejects.toBeInstanceOf(ShoppingListError)
  })
})
