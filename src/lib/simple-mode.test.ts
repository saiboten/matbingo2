import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { SimpleModeError, addListItem, isSimpleUser } = await import('./simple-mode')

const family = (adminId: string | null) =>
  ({
    family: {
      findUnique: vi.fn().mockResolvedValue({
        adminId,
        members: [
          { id: 'old', createdAt: new Date('2025-01-01') },
          { id: 'new', createdAt: new Date('2026-01-01') },
        ],
      }),
    },
  }) as never

describe('isSimpleUser', () => {
  it('gives everyone but the owner the simple mode', async () => {
    expect(await isSimpleUser('old', 'f', family('old'))).toBe(false)
    expect(await isSimpleUser('new', 'f', family('old'))).toBe(true)
  })
  it('treats the oldest member as owner in families made before owners were recorded', async () => {
    expect(await isSimpleUser('old', 'f', family(null))).toBe(false)
    expect(await isSimpleUser('new', 'f', family(null))).toBe(true)
  })
})

function listDb(items: { id: string; name: string; checked: boolean }[], known: { nameKey: string; aisle: string }[] = []) {
  return {
    shoppingList: { findFirst: vi.fn().mockResolvedValue({ id: 'L', items }) },
    shoppingListItem: {
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      create: vi.fn(async ({ data }: any) => ({ id: 'new', ...data })),
    },
    ingredient: { findMany: vi.fn().mockResolvedValue(known), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as never
}

describe('addListItem', () => {
  it('adds a new item as an extra, in the aisle the family uses for it', async () => {
    const db = listDb([], [{ nameKey: 'melk', aisle: 'DRY' }])
    expect(await addListItem('f', 'L', '  Melk ', db)).toMatchObject({ name: 'Melk', aisle: 'DRY', sources: ['Ekstra'], shoppingListId: 'L' })
  })

  it('guesses the aisle for an unknown item', async () => {
    expect(await addListItem('f', 'L', 'Gulrøtter', listDb([]))).toMatchObject({ aisle: 'PRODUCE' })
  })

  it('puts an item that is already there back on the list instead of duplicating it', async () => {
    const db = listDb([{ id: 'x', name: 'Melk', checked: true }])
    expect(await addListItem('f', 'L', 'melk', db)).toMatchObject({ id: 'x', checked: false })
    expect((db as any).shoppingListItem.create).not.toHaveBeenCalled()
  })

  it('refuses empty names and lists of other families', async () => {
    await expect(addListItem('f', 'L', '  ', listDb([]))).rejects.toBeInstanceOf(SimpleModeError)
    const db = { shoppingList: { findFirst: vi.fn().mockResolvedValue(null) } } as never
    await expect(addListItem('f', 'L', 'Melk', db)).rejects.toMatchObject({ status: 404 })
  })
})
