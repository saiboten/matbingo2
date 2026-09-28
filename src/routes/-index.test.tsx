// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../components/ui/toast'

const navigate = vi.fn()
let pathname = '/'

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    createFileRoute: () => (options: unknown) => options,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useNavigate: () => navigate,
    useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { pathname } }),
  }
})
vi.mock('../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }),
}))

const { ShoppingListPage } = await import('./index')

const ITEMS = [
  { id: 'a', name: 'Melk', aisle: 'CHILLED', checked: false, sources: ['Ekstra'], mealDate: null },
  { id: 'b', name: 'Brød', aisle: 'BAKERY', checked: true, sources: ['Ekstra'], mealDate: null },
  { id: 'c', name: 'Løk', aisle: 'PRODUCE', checked: false, sources: ['Taco'], mealDate: '2026-10-01T00:00:00.000Z' },
  { id: 'd', name: 'Løk', aisle: 'PRODUCE', checked: false, sources: ['Suppe'], mealDate: '2026-10-03T00:00:00.000Z' },
]

const COMMON = [
  { id: 'x', name: 'Egg', aisle: 'CHILLED' },
  { id: 'y', name: 'Melk', aisle: 'CHILLED' },
  { id: 'z', name: 'Løk', aisle: 'PRODUCE' },
]

function mockServer(items: unknown[] = ITEMS) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      if (url === '/api/shopping-list' && method === 'GET') return { ok: true, status: 200, json: async () => ({ shoppingList: { id: 'L1', items } }) }
      if (url === '/api/common-items') return { ok: true, status: 200, json: async () => ({ items: COMMON }) }
      if (url === '/api/known-ingredients') return { ok: true, status: 200, json: async () => ({ ingredients: [{ name: 'Egg', aisle: 'CHILLED' }] }) }
      if (url === '/api/simple-mode') return { ok: true, status: 200, json: async () => ({ simple: false }) }
      if (method === 'POST') {
        const { name, aisle } = JSON.parse(init!.body as string)
        return { ok: true, status: 200, json: async () => ({ item: { id: 'new', name, aisle: aisle ?? 'CHILLED', checked: false, sources: ['Ekstra'], mealDate: null } }) }
      }
      return { ok: true, status: 200, json: async () => ({ success: true }) }
    })
  )
  return calls
}

const renderPage = () => render(<ToastProvider><ShoppingListPage /></ToastProvider>)
const listNames = () => screen.getAllByRole('checkbox').map(box => box.closest('label')!.querySelector('p')!.textContent)

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
  pathname = '/'
})

describe('the shopping list page', () => {
  it('shows what is not yet bought, by aisle, with one line per ingredient', async () => {
    mockServer()
    renderPage()
    expect(await screen.findByText('fra: Taco (tor.), Suppe (lør.)')).toBeTruthy()
    expect(listNames()).toEqual(['Løk', 'Melk'])
    expect(screen.getByText('1 av 3 varer krysset av')).toBeTruthy()
  })

  it('shows the checked items only when asked', async () => {
    mockServer()
    renderPage()
    await screen.findAllByText('Melk')
    expect(screen.queryByText('Brød')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Vis avkryssede \(1\)/ }))
    expect(listNames()).toEqual(['Løk', 'Melk', 'Brød'])
    fireEvent.click(screen.getByRole('button', { name: /Skjul avkryssede/ }))
    expect(screen.queryByText('Brød')).toBeNull()
  })

  it('checks off every dinner an ingredient is for at once', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('fra: Taco (tor.), Suppe (lør.)')
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    await waitFor(() => expect(screen.getByText('2 av 3 varer krysset av')).toBeTruthy())
    const patch = calls.find(call => call.method === 'PATCH')!
    expect(patch.url).toBe('/api/shopping-list')
    expect(JSON.parse(patch.body!)).toEqual({ itemIds: ['c', 'd'], checked: true })
  })

  it('adds an everyday item with a tap, and takes it off with another', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findAllByText('Melk')

    fireEvent.click(screen.getByRole('button', { name: 'Egg' }))
    await waitFor(() => expect(listNames()).toContain('Egg'))
    expect(JSON.parse(calls.find(call => call.method === 'POST')!.body!)).toEqual({ name: 'Egg', aisle: 'CHILLED' })

    // Melk was added by hand, so tapping it takes it off
    fireEvent.click(screen.getByRole('button', { name: 'Melk' }))
    await waitFor(() => expect(listNames()).not.toContain('Melk'))
    expect(calls.find(call => call.method === 'DELETE')!.url).toBe('/api/shopping-list?itemId=a')
  })

  it('does not let an everyday item take a recipe ingredient off', async () => {
    mockServer()
    renderPage()
    await screen.findAllByText('Melk')
    const chip = screen.getByRole('button', { name: 'Løk' }) as HTMLButtonElement
    expect(chip.disabled).toBe(true)
    expect(chip.title).toBe('Kommer fra en oppskrift')
  })

  it('adds a typed item to the list', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findAllByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'Batterier' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Legg til/ })[0])
    await waitFor(() => expect(listNames()).toContain('Batterier'))
    expect(calls.find(call => call.method === 'POST')!.url).toBe('/api/shopping-list')
  })

  it('points to the meal plan when the list is empty', async () => {
    mockServer([])
    renderPage()
    expect(await screen.findByText(/Listen er tom/)).toBeTruthy()
  })
})
