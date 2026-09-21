// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/toast'

let sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: true }
const subscribers = new Set<() => void>()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
}))
vi.mock('../../lib/auth-client', async () => {
  const React = await import('react')
  return {
    useSession: () => {
      const [, force] = React.useState(0)
      React.useEffect(() => {
        const update = () => force(n => n + 1)
        subscribers.add(update)
        return () => void subscribers.delete(update)
      }, [])
      return sessionState
    },
  }
})

const { SettingsPage } = await import('./index')

const setSession = (state: typeof sessionState) => act(async () => {
  sessionState = state
  subscribers.forEach(update => update())
})

const inFamily = { data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }

// A family answer that arrives only when told to, like a slow network
function slowFamilyServer() {
  let answer: () => void = () => {}
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise(resolve => {
          answer = () =>
            resolve({ ok: true, json: async () => ({ family: { id: 'f1', name: 'Testfamilien', inviteCode: 'ABC', adminId: 'u1', members: [{ id: 'u1', name: 'Meg', email: 'a@b.no', createdAt: '2026-01-01' }] } }) })
        })
    )
  )
  return { answer: () => act(async () => { answer() }) }
}

const renderPage = () => render(<ToastProvider><SettingsPage /></ToastProvider>)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  subscribers.clear()
  sessionState = { data: null, isPending: true }
})

describe('the settings page while it is loading', () => {
  it('never offers to join a family while the session, and then the family, is being fetched', async () => {
    const server = slowFamilyServer()
    renderPage()
    expect(screen.queryByText('Bli med i en familie')).toBeNull()
    expect(screen.getByText('Laster ...')).toBeTruthy()

    // the session is known, the family is on its way
    await setSession(inFamily)
    expect(screen.queryByText('Bli med i en familie')).toBeNull()
    expect(screen.getByText('Laster ...')).toBeTruthy()

    await server.answer()
    expect(await screen.findByText('Testfamilien')).toBeTruthy()
    expect(screen.queryByText('Bli med i en familie')).toBeNull()
  })

  it('offers to join or create a family once it is known that there is none', async () => {
    renderPage()
    await setSession({ data: { user: { id: 'u1', familyId: null } }, isPending: false })
    expect(await screen.findByText('Bli med i en familie')).toBeTruthy()
  })

  it('says the family could not be loaded instead of offering to join another', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    await setSession(inFamily)
    expect(await screen.findByText('Kunne ikke hente familien.')).toBeTruthy()
    expect(screen.queryByText('Bli med i en familie')).toBeNull()
    log.mockRestore()
  })
})
