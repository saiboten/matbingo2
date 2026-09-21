// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/toast'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    createFileRoute: () => (options: unknown) => options,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useNavigate: () => navigate,
  }
})
vi.mock('../../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }),
}))

const { NewShoppingListView } = await import('./new')

type Reply = { ok: boolean; status: number; body: unknown } | 'network-error'

const PREVIEW: Reply = {
  ok: true,
  status: 200,
  body: {
    recipeCount: 1,
    items: [
      { name: 'Kjøttdeig', aisle: 'MEAT', sources: ['Taco'] },
      { name: 'Løk', aisle: 'PRODUCE', sources: ['Taco'] },
    ],
  },
}

const COMMON = {
  items: [
    { id: '1', name: 'Melk', aisle: 'CHILLED' },
    { id: '2', name: 'Brød', aisle: 'BAKERY' },
    { id: '3', name: 'Egg', aisle: 'CHILLED' },
    { id: '4', name: 'Smør', aisle: 'CHILLED' },
    { id: '5', name: 'Løk', aisle: 'PRODUCE' },
    { id: '6', name: 'Kjøttdeig', aisle: 'MEAT' },
  ],
}

// A fetch that answers the preview and the create call, and remembers what was asked
function mockServer(replies: { preview?: Reply; create?: Reply } = {}) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      if (url === '/api/common-items') return { ok: true, status: 200, json: async () => COMMON }
      const reply = method === 'POST' ? replies.create : replies.preview ?? PREVIEW
      if (!reply || reply === 'network-error') throw new TypeError('Failed to fetch')
      return { ok: reply.ok, status: reply.status, json: async () => reply.body }
    })
  )
  return calls
}

function renderView(dates = '2026-09-14,2026-09-15') {
  return render(
    <ToastProvider>
      <NewShoppingListView dates={dates} />
    </ToastProvider>
  )
}

const createButton = () => screen.getByRole('button', { name: /Lag handleliste/ })

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
})

describe('the "add more" step of making a shopping list', () => {
  it('shows what the recipes contribute and asks the server for exactly the chosen days', async () => {
    const calls = mockServer()
    renderView()

    expect(await screen.findByText('2 varer fra 1 oppskrift')).toBeTruthy()
    expect(calls.map(call => call.url)).toContain('/api/shopping-lists/preview?dates=2026-09-14,2026-09-15')
    expect(createButton().textContent).toContain('(2 varer)')
    // once in the summary, and once as an "already included" chip among the everyday items
    expect(screen.getAllByText('Kjøttdeig')).toHaveLength(2)
  })

  it('offers everyday items, and one tap adds or removes them', async () => {
    mockServer()
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')

    for (const basic of ['Melk', 'Brød', 'Egg', 'Smør']) expect(screen.getByRole('button', { name: basic })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Melk' }))
    expect(screen.getByRole('button', { name: 'Melk' }).getAttribute('aria-pressed')).toBe('true')
    expect(createButton().textContent).toContain('(3 varer)')

    fireEvent.click(screen.getByRole('button', { name: 'Melk' }))
    expect(createButton().textContent).toContain('(2 varer)')
  })

  it('shows an item that a recipe already brings as included and does not count it twice', async () => {
    mockServer()
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')

    const onion = screen.getByRole('button', { name: 'Løk' }) as HTMLButtonElement
    expect(onion.disabled).toBe(true)
    expect(onion.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(onion)
    expect(createButton().textContent).toContain('(2 varer)')
  })

  it('adds free-text items, refuses duplicates and lets you remove them', async () => {
    mockServer()
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')

    const input = screen.getByLabelText('Annen vare')
    fireEvent.change(input, { target: { value: '  Batterier  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Legg til/ }))
    expect(screen.getByText('Batterier')).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('')
    expect(createButton().textContent).toContain('(3 varer)')

    // already coming from a recipe
    fireEvent.change(input, { target: { value: 'løk' } })
    fireEvent.click(screen.getByRole('button', { name: /Legg til/ }))
    expect(await screen.findByText('«løk» er allerede med')).toBeTruthy()
    expect(createButton().textContent).toContain('(3 varer)')

    fireEvent.click(screen.getByRole('button', { name: 'Fjern Batterier' }))
    expect(screen.queryByText('Batterier')).toBeNull()
    expect(createButton().textContent).toContain('(2 varer)')
  })

  it('makes the list from the days and the extras, then opens it', async () => {
    const calls = mockServer({ create: { ok: true, status: 200, body: { shoppingList: { id: 'L1' } } } })
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')

    fireEvent.click(screen.getByRole('button', { name: 'Melk' }))
    fireEvent.change(screen.getByLabelText('Annen vare'), { target: { value: 'Batterier' } })
    fireEvent.click(screen.getByRole('button', { name: /Legg til/ }))
    fireEvent.click(createButton())

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/shopping-lists/$listId', params: { listId: 'L1' } }))
    const post = calls.find(call => call.method === 'POST')!
    expect(post.url).toBe('/api/shopping-lists')
    expect(JSON.parse(post.body!)).toEqual({
      dates: ['2026-09-14', '2026-09-15'],
      extras: [{ name: 'Melk', aisle: 'CHILLED' }, { name: 'Batterier' }],
    })
  })

  it('shows the server message and stays put when making the list fails', async () => {
    mockServer({ create: { ok: false, status: 400, body: { error: 'Ingen oppskrifter på de valgte dagene' } } })
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')

    fireEvent.click(createButton())

    expect(await screen.findByText('Ingen oppskrifter på de valgte dagene')).toBeTruthy()
    expect(navigate).not.toHaveBeenCalled()
    expect((createButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it('still lets you add extras when the recipe items cannot be loaded', async () => {
    mockServer({ preview: { ok: false, status: 500, body: {} } })
    renderView()

    expect((await screen.findByRole('alert')).textContent).toContain('feil 500')
    fireEvent.click(screen.getByRole('button', { name: 'Melk' }))
    expect(createButton().textContent).toContain('(1 vare)')
  })

  it('explains what to do when no days were chosen, without asking the server anything', () => {
    const calls = mockServer()
    renderView('')
    expect(screen.getByText('Ingen dager valgt')).toBeTruthy()
    expect(calls.filter(call => call.url.includes('preview'))).toHaveLength(0)
  })

  it("offers the family's own list, links to where it is edited, and says so when it is empty", async () => {
    mockServer()
    renderView()
    await screen.findByText('2 varer fra 1 oppskrift')
    expect(screen.getByRole('link', { name: /Rediger listen/ }).getAttribute('href')).toBe('/shopping-lists/common-items')
    expect(screen.queryByRole('button', { name: 'Toalettpapir' })).toBeNull()
  })

  it('ignores anything in the address that is not a day', async () => {
    const calls = mockServer()
    renderView('2026-09-14,<script>,abc,')
    await screen.findByText('2 varer fra 1 oppskrift')
    expect(calls.map(call => call.url)).toContain('/api/shopping-lists/preview?dates=2026-09-14')
  })
})
