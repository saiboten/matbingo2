import { describe, expect, it, vi } from 'vitest'
import { createFamilyAisle, isFamilyAisle } from './family-aisles'

function makeDb(rows: { id: string; familyId: string; name: string; nameKey: string }[] = []) {
  const db = {
    familyAisle: {
      upsert: vi.fn(async ({ where, create }) => {
        const found = rows.find(row => row.familyId === where.familyId_nameKey.familyId && row.nameKey === where.familyId_nameKey.nameKey)
        if (found) return { id: found.id, name: found.name }
        const row = { id: `id-${rows.length + 1}`, ...create }
        rows.push(row)
        return { id: row.id, name: row.name }
      }),
      count: vi.fn(async ({ where }) => rows.filter(row => row.id === where.id && row.familyId === where.familyId).length),
    },
  }
  return { db: db as never, rows }
}

describe('createFamilyAisle', () => {
  it('makes a new aisle with the name tidied up', async () => {
    const { db, rows } = makeDb()
    expect(await createFamilyAisle('F1', '  Drikke   og brus ', db)).toEqual({ id: 'id-1', name: 'Drikke og brus' })
    expect(rows[0].nameKey).toBe('drikke og brus')
  })

  it('gives back the aisle the family already has by that name', async () => {
    const { db, rows } = makeDb([{ id: 'x', familyId: 'F1', name: 'Drikke', nameKey: 'drikke' }])
    expect(await createFamilyAisle('F1', 'DRIKKE', db)).toEqual({ id: 'x', name: 'Drikke' })
    expect(rows).toHaveLength(1)
  })

  it('gives back a built-in aisle with the same name', async () => {
    const { db, rows } = makeDb()
    expect(await createFamilyAisle('F1', 'kjøtt', db)).toEqual({ id: 'MEAT', name: 'Kjøtt' })
    expect(rows).toHaveLength(0)
  })

  it('refuses an empty or too long name', async () => {
    const { db } = makeDb()
    await expect(createFamilyAisle('F1', '  ', db)).rejects.toThrow('Skriv inn navnet på hyllen')
    await expect(createFamilyAisle('F1', 'x'.repeat(41), db)).rejects.toThrow('Navnet er for langt')
  })
})

describe('isFamilyAisle', () => {
  const { db } = makeDb([{ id: 'x', familyId: 'F1', name: 'Drikke', nameKey: 'drikke' }])

  it('accepts the built-in aisles and the family’s own, not another family’s', async () => {
    expect(await isFamilyAisle('F1', 'PRODUCE', db)).toBe(true)
    expect(await isFamilyAisle('F1', 'x', db)).toBe(true)
    expect(await isFamilyAisle('F2', 'x', db)).toBe(false)
    expect(await isFamilyAisle('F1', 42, db)).toBe(false)
  })
})
