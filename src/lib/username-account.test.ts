import { describe, expect, it } from 'vitest'
import { accountLabel, isUsernameEmail, usernameEmail } from './username-account'

describe('username accounts', () => {
  it('give each username its own made-up email that is recognised as one', () => {
    expect(usernameEmail(' Ola.N ')).toBe('ola.n@brukernavn.matbingo.invalid')
    expect(isUsernameEmail(usernameEmail('ola'))).toBe(true)
    expect(isUsernameEmail('ola@gmail.com')).toBe(false)
    expect(isUsernameEmail(null)).toBe(false)
  })

  it('show the username instead of the made-up email', () => {
    expect(accountLabel({ email: usernameEmail('ola'), username: 'ola', displayUsername: 'Ola' })).toBe('@Ola')
    expect(accountLabel({ email: 'kari@gmail.com', username: null })).toBe('kari@gmail.com')
  })
})
