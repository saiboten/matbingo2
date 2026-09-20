// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

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

const { AdminGate } = await import('./admin-gate')
const { default: Header } = await import('./Header')

const asUser = (email: string) => ({
  data: { user: { id: 'u1', name: 'Bruker', email, image: null, familyId: 'f1' } },
  isPending: false,
})

afterEach(() => {
  cleanup()
  navigate.mockReset()
})

describe('the admin link in the header', () => {
  it('is shown to the super admin, in the bar and in the phone menu', () => {
    sessionState = asUser('saiboten@gmail.com')
    render(<Header />)
    // once for the wide-screen bar (the phone menu is closed until opened)
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Admin').closest('a')?.getAttribute('href')).toBe('/admin/blueprints')
  })

  it('is not shown to anyone else', () => {
    sessionState = asUser('tobias.rusas.olsen@gmail.com')
    render(<Header />)
    expect(screen.queryByText('Admin')).toBeNull()
    expect(screen.getByText('Ukesmeny')).toBeTruthy()
  })
})

describe('AdminGate', () => {
  it('shows its content to the super admin', () => {
    sessionState = asUser('saiboten@gmail.com')
    render(<AdminGate><p>Hemmelig innhold</p></AdminGate>)
    expect(screen.getByText('Hemmelig innhold')).toBeTruthy()
  })

  it('keeps everyone else out', () => {
    sessionState = asUser('noen.andre@example.com')
    render(<AdminGate><p>Hemmelig innhold</p></AdminGate>)
    expect(screen.queryByText('Hemmelig innhold')).toBeNull()
    expect(screen.getByText('Ingen tilgang')).toBeTruthy()
  })

  it('sends a logged-out visitor to the login page without showing anything', () => {
    sessionState = { data: null, isPending: false }
    render(<AdminGate><p>Hemmelig innhold</p></AdminGate>)
    expect(screen.queryByText('Hemmelig innhold')).toBeNull()
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })

  it('shows nothing while the session is still loading', () => {
    sessionState = { data: null, isPending: true }
    render(<AdminGate><p>Hemmelig innhold</p></AdminGate>)
    expect(screen.queryByText('Hemmelig innhold')).toBeNull()
    expect(screen.queryByText('Ingen tilgang')).toBeNull()
  })
})
