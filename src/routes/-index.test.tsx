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

const BASKETS = [{ id: 'B1', name: 'Ukeshandel', items: ['Brød', 'Melk', 'Yoghurt'] }]

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
      if (url === '/api/baskets') return { ok: true, status: 200, json: async () => ({ baskets: BASKETS }) }
      if (url === '/api/baskets/B1' && method === 'POST') return { ok: true, status: 200, json: async () => ({ added: 2 }) }
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
// The names under «På listen»
const listNames = () =>
  Array.from(screen.getByRole('heading', { name: /På listen/ }).closest('section')!.querySelectorAll('li')).map(
    li => li.querySelector('span span')!.textContent
  )

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
  pathname = '/'
})

describe('planning the shopping', () => {
  it('shows what is still to be bought, one line per ingredient, and leads on to the shopping', async () => {
    mockServer()
    renderPage()
    expect(await screen.findByText('fra: Taco (tor.), Suppe (lør.)')).toBeTruthy()
    // Brød is checked off, so it only shows in the store
    expect(listNames()).toEqual(['Løk', 'Melk'])
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    const start = screen.getByRole('link', { name: /Start handelen \(2 varer\)/ })
    expect(start.getAttribute('href')).toBe('/shop')
  })

  it('takes an item added by hand off the list, but not a recipe ingredient', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findAllByText('Melk')
    expect(screen.queryByRole('button', { name: 'Fjern Løk' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fjern Melk' }))
    await waitFor(() => expect(listNames()).toEqual(['Løk']))
    expect(calls.find(call => call.method === 'DELETE')!.url).toBe('/api/shopping-list?itemId=a')
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

  it('puts a basket on the list with one tap, and links to making a new one', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Brød, Melk, Yoghurt')
    expect(screen.getByRole('link', { name: /Ny kurv/ }).getAttribute('href')).toBe('/baskets/new')
    expect(screen.getByRole('link', { name: 'Rediger Ukeshandel' }).getAttribute('href')).toBe('/baskets/$basketId')

    fireEvent.click(screen.getByRole('button', { name: 'Legg Ukeshandel i handlelisten' }))
    expect(await screen.findByText('La til 2 varer fra «Ukeshandel»')).toBeTruthy()
    expect(calls.find(call => call.method === 'POST')!.url).toBe('/api/baskets/B1')
    // the list is fetched again so it shows what the basket added
    expect(calls.filter(call => call.url === '/api/shopping-list' && call.method === 'GET')).toHaveLength(2)
  })

  it('shows a typed item at once, before the server has answered', async () => {
    const calls = mockServer()
    let answer!: (value: unknown) => void
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const server = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        calls.push({ url, method: 'POST', body: init.body as string })
        return new Promise(resolve => (answer = resolve))
      }
      return server(url, init)
    })
    renderPage()
    await screen.findAllByText('Melk')

    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'Batterier' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Legg til/ })[0])
    expect(listNames()).toContain('Batterier')
    expect((screen.getByLabelText('Ny vare') as HTMLInputElement).value).toBe('')
    // not removable until it is saved
    expect((screen.getByRole('button', { name: 'Fjern Batterier' }) as HTMLButtonElement).disabled).toBe(true)

    answer({ ok: true, status: 200, json: async () => ({ item: { id: 'saved', name: 'Batterier', aisle: 'OTHER', checked: false, sources: ['Ekstra'], mealDate: null } }) })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Fjern Batterier' }) as HTMLButtonElement).disabled).toBe(false))
    expect(listNames().filter(name => name === 'Batterier')).toHaveLength(1)
  })

  it('takes an everyday item off again, and says so, when it cannot be saved', async () => {
    mockServer()
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const server = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'POST' ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'Kunne ikke legge til varen' }) }) : server(url, init)
    )
    renderPage()
    await screen.findAllByText('Melk')

    fireEvent.click(screen.getByRole('button', { name: 'Egg' }))
    expect(listNames()).toContain('Egg')
    expect(await screen.findByText('Kunne ikke legge til varen')).toBeTruthy()
    await waitFor(() => expect(listNames()).not.toContain('Egg'))
  })

  it('shows the items of a basket at once', async () => {
    mockServer()
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    const server = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'POST' ? new Promise(() => {}) : server(url, init)
    )
    renderPage()
    await screen.findByText('Brød, Melk, Yoghurt')
    fireEvent.click(screen.getByRole('button', { name: 'Legg Ukeshandel i handlelisten' }))
    // Brød was checked off and comes back; Melk is already there; Yoghurt is new
    expect(listNames()).toEqual(['Løk', 'Melk', 'Yoghurt', 'Brød'])
    expect(screen.getByText('La til 2 varer fra «Ukeshandel»')).toBeTruthy()
  })
})
