import { describe, expect, it } from 'vitest'
import { describeTarget, envFileFor, isLocalHost, parseDatabaseUrl, validateEnvironment } from './env-launcher.mjs'

const LOCAL = 'postgresql://matbingo:matbingo@localhost:5432/matbingo_dev'
const PROD = 'postgresql://user:pw@ep-fancy-sky-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full'

describe('parseDatabaseUrl', () => {
  it('reads the host and the database name', () => {
    expect(parseDatabaseUrl(LOCAL)).toEqual({ host: 'localhost', database: 'matbingo_dev' })
    expect(parseDatabaseUrl(PROD)).toEqual({ host: 'ep-fancy-sky-pooler.eu-central-1.aws.neon.tech', database: 'neondb' })
  })

  it('gives null for anything that is not a URL', () => {
    expect(parseDatabaseUrl('')).toBeNull()
    expect(parseDatabaseUrl(undefined)).toBeNull()
    expect(parseDatabaseUrl('not a url')).toBeNull()
  })
})

describe('isLocalHost', () => {
  it('recognises this machine', () => {
    for (const host of ['localhost', '127.0.0.1', '::1', '[::1]']) expect(isLocalHost(host)).toBe(true)
    expect(isLocalHost('ep-fancy-sky.neon.tech')).toBe(false)
    expect(isLocalHost('localhost.evil.com')).toBe(false)
  })
})

describe('validateEnvironment', () => {
  it('accepts a local dev file and a remote prod file', () => {
    expect(validateEnvironment('dev', { DATABASE_URL: LOCAL }).ok).toBe(true)
    expect(validateEnvironment('prod', { DATABASE_URL: PROD }).ok).toBe(true)
  })

  it('refuses a dev file that points at a remote database', () => {
    const result = validateEnvironment('dev', { DATABASE_URL: PROD })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('ikke en lokal database')
  })

  it('refuses a prod file that points at this machine', () => {
    const result = validateEnvironment('prod', { DATABASE_URL: LOCAL })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('lokal database')
  })

  it('refuses a missing or invalid database URL, and unknown environments', () => {
    expect(validateEnvironment('dev', {}).ok).toBe(false)
    expect(validateEnvironment('prod', { DATABASE_URL: 'nope' }).ok).toBe(false)
    expect(validateEnvironment('staging', { DATABASE_URL: PROD }).ok).toBe(false)
  })
})

describe('messages', () => {
  it('names the env file', () => {
    expect(envFileFor('prod')).toBe('.env.prod')
  })

  it('makes production impossible to miss, and never shows the password', () => {
    const prod = describeTarget('prod', { host: 'db.example.com', database: 'neondb' })
    expect(prod).toContain('PRODUKSJON')
    expect(prod).toContain('db.example.com')
    expect(describeTarget('dev', { host: 'localhost', database: 'matbingo_dev' })).not.toContain('PRODUKSJON')
    expect(describeTarget('prod', { host: 'h', database: 'd' })).not.toContain('pw')
  })
})
