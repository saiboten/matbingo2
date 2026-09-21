// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigate = vi.fn()
let sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false }

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useNavigate: () => navigate,
    useRouterState: () => '/',
  }
})
vi.mock('../lib/auth-client', () => ({
  useSession: () => sessionState,
  signOut: vi.fn(),
}))

const { default: Header } = await import('./Header')

// A fresh user id per test, since the default answer is remembered per user
let counter = 0
function signIn(defaultSimple: boolean) {
  const id = `mode-user-${counter++}`
  sessionState = { data: { user: { id, name: 'Bruker', email: 'a@example.com', image: null, familyId: 'f1' } }, isPending: false }
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ simple: defaultSimple }) })))
  return id
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
})

describe('switching between the simple and the full view', () => {
  it('offers the simple view to the owner, and remembers the choice', async () => {
    const id = signIn(false)
    render(<Header />)

    fireEvent.click(await screen.findByRole('button', { name: /Enkel visning/ }))
    expect(navigate).toHaveBeenCalledWith({ to: '/simple' })
    expect(localStorage.getItem(`matbingo-view-mode:${id}`)).toBe('simple')

    // now the bar only has the shopping list, and the button offers the way back
    expect(await screen.findByRole('button', { name: /Full visning/ })).toBeTruthy()
    expect(screen.queryByText('Oppskrifter')).toBeNull()
  })

  it('lets a simple-mode user open the full view', async () => {
    const id = signIn(true)
    render(<Header />)

    // no wrong menu while the default is looked up, then only the shopping list
    expect(screen.queryByText('Oppskrifter')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: /Full visning/ }))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
    expect(localStorage.getItem(`matbingo-view-mode:${id}`)).toBe('full')
    await waitFor(() => expect(screen.getByText('Oppskrifter')).toBeTruthy())
  })

  it('starts in the remembered view instead of the default', async () => {
    const id = signIn(true)
    localStorage.setItem(`matbingo-view-mode:${id}`, 'full')
    render(<Header />)
    expect(await screen.findByRole('button', { name: /Enkel visning/ })).toBeTruthy()
    expect(screen.getByText('Oppskrifter')).toBeTruthy()
  })

  it('also works from the phone menu', async () => {
    signIn(false)
    render(<Header />)
    await screen.findByRole('button', { name: /Enkel visning/ })
    fireEvent.click(screen.getByRole('button', { name: 'Meny' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Bytt til enkel visning/ }))
    expect(navigate).toHaveBeenCalledWith({ to: '/simple' })
  })
})
