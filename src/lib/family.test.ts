import { describe, expect, it } from 'vitest'
import { buildInviteMessage, effectiveAdminId } from './family'

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
