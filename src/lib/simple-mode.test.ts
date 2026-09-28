import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
const { isSimpleUser } = await import('./simple-mode')

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
