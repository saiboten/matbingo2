import { describe, expect, it } from 'vitest'
import { isSuperAdmin } from './super-admin'

describe('isSuperAdmin', () => {
  it('recognises saiboten@gmail.com, ignoring case and spaces', () => {
    expect(isSuperAdmin('saiboten@gmail.com')).toBe(true)
    expect(isSuperAdmin('  SaiBoten@Gmail.com ')).toBe(true)
  })

  it('refuses everyone else, and missing emails', () => {
    expect(isSuperAdmin('tobias.rusas.olsen@gmail.com')).toBe(false)
    expect(isSuperAdmin('saiboten@gmail.com.evil.com')).toBe(false)
    expect(isSuperAdmin('')).toBe(false)
    expect(isSuperAdmin(null)).toBe(false)
    expect(isSuperAdmin(undefined)).toBe(false)
  })

  it('can use another list, e.g. the server override', () => {
    expect(isSuperAdmin('a@b.no', ['a@b.no'])).toBe(true)
    expect(isSuperAdmin('saiboten@gmail.com', ['a@b.no'])).toBe(false)
  })
})
