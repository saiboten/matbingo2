// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BLUEPRINTS } from '../../data/blueprint-recipes'
import { ToastProvider } from '../../components/ui/toast'

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    createFileRoute: () => (options: unknown) => options,
    Link: ({ children, to, params }: { children: React.ReactNode; to: string; params?: { recipeId?: string } }) =>
      React.createElement('a', { href: to.replace('$recipeId', params?.recipeId ?? '') }, children),
    useNavigate: () => vi.fn(),
  }
})
vi.mock('../../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }),
}))

const { RecipeLibraryPage } = await import('./library')

type Reply = { ok: boolean; status: number; body: unknown } | 'network-error'

// A fetch that answers per URL/method, and remembers what was asked
function mockServer(replies: { check: Reply; add?: Reply }) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      const reply = url === '/api/blueprints/add' ? replies.add : replies.check
      if (!reply || reply === 'network-error') throw new TypeError('Failed to fetch')
      return { ok: reply.ok, status: reply.status, json: async () => reply.body }
    })
  )
  return calls
}

function renderPage() {
  return render(
    <ToastProvider>
      <RecipeLibraryPage />
    </ToastProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('the recipe library page', () => {
  it('shows all ten blueprints even when checking the account fails', async () => {
    mockServer({ check: { ok: false, status: 401, body: { error: 'Du må være logget inn' } } })
    renderPage()

    for (const blueprint of BLUEPRINTS) {
      expect(screen.getByText(blueprint.name)).toBeTruthy()
    }
    expect((await screen.findByRole('alert')).textContent).toContain('feil 401')
    expect(screen.getByText('Prøv igjen')).toBeTruthy()
    expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(10)
  })

  it('still shows the library when the server cannot be reached', async () => {
    mockServer({ check: 'network-error' })
    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain('ingen kontakt med serveren')
    expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(10)
  })

  it('marks blueprints the family already has and links to that recipe', async () => {
    mockServer({ check: { ok: true, status: 200, body: { added: { pannekaker: 'r9' } } } })
    renderPage()

    await waitFor(() => expect(screen.getAllByText('Lagt til')).toHaveLength(1))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(9)
    expect(screen.getByText('Åpne oppskriften').closest('a')?.getAttribute('href')).toBe('/recipes/r9')
  })

  it('adds a recipe, shows it as added and confirms with a toast', async () => {
    const calls = mockServer({
      check: { ok: true, status: 200, body: { added: {} } },
      add: { ok: true, status: 200, body: { recipe: { id: 'new1' } } },
    })
    renderPage()

    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByText('Legg til i mine oppskrifter')[0])

    await waitFor(() => expect(screen.getAllByText('Lagt til')).toHaveLength(1))
    expect(screen.getByText('«Spagetti bolognese» er lagt til i oppskriftene dine')).toBeTruthy()

    const post = calls.find(call => call.method === 'POST')!
    expect(post.url).toBe('/api/blueprints/add')
    expect(JSON.parse(post.body!)).toEqual({ blueprintId: 'spagetti-bolognese' })
    expect(screen.getByText('Åpne oppskriften').closest('a')?.getAttribute('href')).toBe('/recipes/new1')
  })

  it('shows the server message when adding fails', async () => {
    mockServer({
      check: { ok: true, status: 200, body: { added: {} } },
      add: { ok: false, status: 500, body: { error: 'Kunne ikke legge til oppskriften' } },
    })
    renderPage()

    await waitFor(() => expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(10))
    fireEvent.click(screen.getAllByText('Legg til i mine oppskrifter')[0])

    expect(await screen.findByText('Kunne ikke legge til oppskriften')).toBeTruthy()
    expect(screen.queryByText('Lagt til')).toBeNull()
  })
})
