import { describe, expect, it } from 'vitest'
import { buildInviteMessage, effectiveAdminId, resolveLeave } from './family'

const members = [
  { id: 'newer', createdAt: '2026-09-17T18:17:29.000Z' },
  { id: 'oldest', createdAt: '2026-09-17T18:15:14.000Z' },
  { id: 'newest', createdAt: '2026-09-18T09:00:00.000Z' },
]

describe('effectiveAdminId', () => {
  it('uses the recorded admin when they are still a member', () => {
    expect(effectiveAdminId('newer', members)).toBe('newer')
  })

  it('falls back to the oldest member when no admin is recorded', () => {
    expect(effectiveAdminId(null, members)).toBe('oldest')
    expect(effectiveAdminId(undefined, members)).toBe('oldest')
  })

  it('falls back to the oldest member when the recorded admin is no longer in the family', () => {
    expect(effectiveAdminId('gone', members)).toBe('oldest')
  })

  it('is null for a family without members', () => {
    expect(effectiveAdminId(null, [])).toBeNull()
  })
})

describe('buildInviteMessage', () => {
  it('contains the family name, the site and the code', () => {
    const message = buildInviteMessage({
      familyName: 'Synne og Tobias',
      inviteCode: 'AB12CD34',
      siteUrl: 'https://matbingo2.vercel.app',
    })
    expect(message).toContain('«Synne og Tobias»')
    expect(message).toContain('https://matbingo2.vercel.app')
    expect(message).toContain('AB12CD34')
  })
})

describe('resolveLeave', () => {
  const memberIds = ['admin', 'anna', 'bo']

  it('lets an ordinary member leave without any hand-over', () => {
    expect(resolveLeave({ userId: 'anna', adminId: 'admin', memberIds })).toEqual({ ok: true, handOverTo: null })
  })

  it('makes the admin hand over to another member first', () => {
    expect(resolveLeave({ userId: 'admin', adminId: 'admin', memberIds })).toMatchObject({
      ok: false,
      status: 400,
      code: 'HAND_OVER_REQUIRED',
    })
    expect(resolveLeave({ userId: 'admin', adminId: 'admin', memberIds, newAdminId: 'admin' })).toMatchObject({
      ok: false,
      code: 'HAND_OVER_REQUIRED',
    })
    expect(resolveLeave({ userId: 'admin', adminId: 'admin', memberIds, newAdminId: 'stranger' })).toMatchObject({
      ok: false,
      code: 'HAND_OVER_REQUIRED',
    })
  })

  it('lets the admin leave once someone else takes over', () => {
    expect(resolveLeave({ userId: 'admin', adminId: 'admin', memberIds, newAdminId: 'bo' })).toEqual({
      ok: true,
      handOverTo: 'bo',
    })
  })

  it('does not let the only member leave', () => {
    expect(resolveLeave({ userId: 'admin', adminId: 'admin', memberIds: ['admin'] })).toMatchObject({
      ok: false,
      code: 'ONLY_MEMBER',
    })
  })

  it('refuses someone who is not in the family', () => {
    expect(resolveLeave({ userId: 'ghost', adminId: 'admin', memberIds })).toMatchObject({
      ok: false,
      status: 404,
      code: 'NOT_A_MEMBER',
    })
  })
})
