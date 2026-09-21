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

const { SimpleListPage } = await import('./simple')
const { default: SimpleModeGuard, isAllowedInSimpleMode } = await import('../components/SimpleModeGuard')

const LIST = {
  id: 'L1',
  createdAt: '2026-09-14T10:00:00.000Z',
  dates: [],
  items: [
    { id: 'a', name: 'Melk', aisle: 'CHILLED', checked: false, sources: [] },
    { id: 'b', name: 'Løk', aisle: 'PRODUCE', checked: true, sources: [] },
  ],
}

function mockServer(latest: unknown = LIST) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      if (url === '/api/shopping-lists/latest') return { ok: true, status: 200, json: async () => ({ shoppingList: latest }) }
      if (url === '/api/known-ingredients') return { ok: true, status: 200, json: async () => ({ ingredients: [{ name: 'Egg', aisle: 'CHILLED' }, { name: 'Eggnog', aisle: 'CHILLED' }, { name: 'Melk', aisle: 'CHILLED' }] }) }
      if (url === '/api/simple-mode') return { ok: true, status: 200, json: async () => ({ simple: true }) }
      if (method === 'POST') return { ok: true, status: 200, json: async () => ({ item: { id: 'c', name: 'Egg', aisle: 'CHILLED', checked: false, sources: ['Ekstra'] } }) }
      return { ok: true, status: 200, json: async () => ({ success: true }) }
    })
  )
  return calls
}

const renderPage = () => render(<ToastProvider><SimpleListPage /></ToastProvider>)

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
  pathname = '/'
})

describe('simple mode list page', () => {
  it('shows the latest list, sorted by aisle', async () => {
    const calls = mockServer()
    renderPage()
    expect(await screen.findByText('Melk')).toBeTruthy()
    expect(calls[0].url).toBe('/api/shopping-lists/latest')
    expect(screen.getByText('1 av 2 varer krysset av')).toBeTruthy()
    const names = screen.getAllByRole('checkbox').map(box => box.closest('label')!.textContent)
    expect(names).toEqual(['Løk', 'Melk'])
  })

  it('crosses items off and back', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    await waitFor(() => expect(screen.getByText('2 av 2 varer krysset av')).toBeTruthy())
    const patch = calls.find(call => call.method === 'PATCH')!
    expect(patch.url).toBe('/api/shopping-lists/L1')
    expect(JSON.parse(patch.body!)).toEqual({ familyId: 'f1', itemId: 'a', checked: true })
  })

  it('adds an item to the list', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: ' Egg ' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Legg til/ })[0])
    expect(await screen.findByText('Egg')).toBeTruthy()
    // a known ingredient is sent by name only, so the server uses the family's shelf
    expect(JSON.parse(calls.find(call => call.method === 'POST')!.body!)).toEqual({ name: 'Egg' })
    expect((screen.getByLabelText('Ny vare') as HTMLInputElement).value).toBe('')
  })

  it('says so when there is no list yet', async () => {
    mockServer(null)
    renderPage()
    expect(await screen.findByText('Det er ikke laget noen handleliste ennå.')).toBeTruthy()
  })
})

describe('simple mode guard', () => {
  it('only allows the list and the settings', () => {
    expect(isAllowedInSimpleMode('/simple')).toBe(true)
    expect(isAllowedInSimpleMode('/settings')).toBe(true)
    for (const path of ['/', '/recipes', '/shopping-lists/x', '/ingredients', '/admin/blueprints']) expect(isAllowedInSimpleMode(path)).toBe(false)
  })

  it('sends a simple-mode user from any other page to the list', async () => {
    mockServer()
    pathname = '/recipes'
    render(<SimpleModeGuard />)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/simple', replace: true }))
  })

  it('leaves a simple-mode user alone on the list', async () => {
    mockServer()
    pathname = '/simple'
    render(<SimpleModeGuard />)
    // the answer is cached from the previous test; give the hook time to apply it
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('adding from the bottom of the list', () => {
  it('has a second field below the items that adds to the same list', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare nederst'), { target: { value: 'Egg' } })
    fireEvent.click(screen.getAllByRole('button', { name: /Legg til/ })[1])
    expect(await screen.findByText('Egg')).toBeTruthy()
    expect(calls.find(call => call.method === 'POST')!.url).toBe('/api/shopping-lists/L1')
    expect((screen.getByLabelText('Ny vare') as HTMLInputElement).value).toBe('')
  })
})

describe('choosing what to add from the known ingredients', () => {
  it('offers matching known ingredients with their shelf, and adds the chosen one by name', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'egg' } })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    const options = screen.getAllByRole('option')
    expect(options[0].textContent).toContain('Egg')
    expect(options[0].textContent).toContain('Meieri')
    expect(options[1].textContent).toContain('Eggnog')
    // "egg" is exactly a known ingredient, so there is no separate add-as-typed row
    fireEvent.click(options[1])
    await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true))
    expect(JSON.parse(calls.find(call => call.method === 'POST')!.body!)).toEqual({ name: 'Eggnog' })
  })

  it('has an add option that puts the text as typed on the Annet shelf', async () => {
    const calls = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'Batterier' } })
    const add = await screen.findByRole('option', { name: /Legg til «Batterier»/ })
    expect(add.textContent).toContain('Annet')
    fireEvent.click(add)
    await waitFor(() => expect(calls.some(call => call.method === 'POST')).toBe(true))
    expect(JSON.parse(calls.find(call => call.method === 'POST')!.body!)).toEqual({ name: 'Batterier', aisle: 'OTHER' })
  })
})
