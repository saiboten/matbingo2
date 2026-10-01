import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { BasketError, MAX_BASKET_ITEMS, addBasketToList, createBasket, deleteBasket, parseBasketInput, updateBasket } = await import('./baskets')

describe('parseBasketInput', () => {
  it('tidies the name and the items, and drops blanks and repeats', () => {
    expect(parseBasketInput({ name: '  Uke  handel ', items: [' Melk ', 'melk', '', 'Brød', 42, 'Yoghurt'] })).toEqual({
      name: 'Uke handel',
      items: ['Melk', 'Brød', 'Yoghurt'],
    })
  })

  it('needs a name and at least one item, and not too many', () => {
    expect(() => parseBasketInput({ name: ' ', items: ['Melk'] })).toThrow(BasketError)
    expect(() => parseBasketInput({ name: 'x'.repeat(61), items: ['Melk'] })).toThrow('Navnet er for langt')
    expect(() => parseBasketInput({ name: 'Uke', items: [] })).toThrow('Velg minst én vare')
    expect(() => parseBasketInput({ name: 'Uke', items: 'Melk' })).toThrow('Velg minst én vare')
    const many = Array.from({ length: MAX_BASKET_ITEMS + 1 }, (_, i) => `Vare ${i}`)
    expect(() => parseBasketInput({ name: 'Uke', items: many })).toThrow(BasketError)
  })
})

const row = { id: 'B', name: 'Uke', items: [{ name: 'Brød' }, { name: 'Melk' }] }

describe('saving baskets', () => {
  it('creates a basket for the family', async () => {
    const create = vi.fn().mockResolvedValue(row)
    const basket = await createBasket('f', { name: 'Uke', items: ['Melk', 'Brød'] }, { basket: { create } } as never)
    expect(basket).toEqual({ id: 'B', name: 'Uke', items: ['Brød', 'Melk'] })
    expect(create.mock.calls[0][0].data).toMatchObject({ familyId: 'f', name: 'Uke', items: { create: [{ name: 'Melk' }, { name: 'Brød' }] } })
  })

  it('only changes a basket of the family, replacing its items', async () => {
    const update = vi.fn().mockResolvedValue(row)
    const db = { basket: { findFirst: vi.fn().mockResolvedValue(row), update } } as never
    await updateBasket('f', 'B', { name: 'Uke', items: ['Melk'] }, db)
    expect(update.mock.calls[0][0].data.items).toEqual({ deleteMany: {}, create: [{ name: 'Melk' }] })

    const other = { basket: { findFirst: vi.fn().mockResolvedValue(null), update } } as never
    await expect(updateBasket('f', 'B', { name: 'Uke', items: ['Melk'] }, other)).rejects.toMatchObject({ status: 404 })
  })

  it('says so when deleting a basket that is not there', async () => {
    const db = { basket: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) } } as never
    await expect(deleteBasket('f', 'B', db)).rejects.toMatchObject({ status: 404 })
  })
})

describe('addBasketToList', () => {
  it('adds what is missing, brings back what was checked off, and leaves what is already there', async () => {
    const items = [
      { id: 'm', name: 'melk', checked: false, mealDate: null },
      { id: 'b', name: 'Brød', checked: true, mealDate: null },
    ]
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const createMany = vi.fn().mockResolvedValue({ count: 1 })
    const db = {
      basket: { findFirst: vi.fn().mockResolvedValue({ id: 'B', name: 'Uke', items: [{ name: 'Brød' }, { name: 'Melk' }, { name: 'Yoghurt' }] }) },
      shoppingList: { upsert: vi.fn().mockResolvedValue({ id: 'L', items }) },
      shoppingListItem: { updateMany, createMany },
      ingredient: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as never

    expect(await addBasketToList('f', 'u', 'B', db)).toBe(2)
    expect(updateMany.mock.calls[0][0]).toEqual({ where: { id: { in: ['b'] } }, data: { checked: false, checkedAt: null, quantity: 1 } })
    expect(createMany.mock.calls[0][0].data).toEqual([
      { shoppingListId: 'L', name: 'Yoghurt', sources: ['Ekstra'], aisle: 'CHILLED' },
    ])
  })
})
