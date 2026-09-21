// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/toast'
import type { Blueprint } from '../../lib/blueprints'

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

const fakeBlueprint = (id: string, name: string, hasImage = false): Blueprint => ({
  id,
  name,
  description: `Om ${name}`,
  ingredients: 'Mel, Egg',
  type: 'OTHER',
  score: 5,
  suitableDays: ['SATURDAY'],
  position: 0,
  updatedAt: '2026-09-20T10:00:00.000Z',
  hasImage,
  imageUrl: null,
  steps: [
    { position: 1, title: 'Lag røren', text: 'Visp.' },
    { position: 2, title: 'Stek', text: 'Stek den.' },
  ],
})
const LIBRARY = [fakeBlueprint('a', 'Pannekaker', true), fakeBlueprint('b', 'Lasagne'), fakeBlueprint('c', 'Suppe')]

type Reply = { ok: boolean; status: number; body: unknown } | 'network-error'
const ok = (body: unknown): Reply => ({ ok: true, status: 200, body })

// A fetch that answers per URL, and remembers what was asked
function mockServer(replies: { library?: Reply; check?: Reply; add?: Reply }) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
      const reply =
        url === '/api/blueprint-library' ? replies.library ?? ok({ blueprints: LIBRARY })
        : url === '/api/blueprints/add' ? replies.add
        : replies.check ?? ok({ added: {} })
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
  it('shows the library from the database, with photos where there are any', async () => {
    mockServer({})
    renderPage()

    for (const blueprint of LIBRARY) {
      expect(await screen.findByText(blueprint.name)).toBeTruthy()
    }
    const photo = document.querySelector('img')!
    expect(photo.getAttribute('src')).toContain('/api/blueprint-image/a?v=')
    expect(document.querySelectorAll('img')).toHaveLength(1)
  })

  it('shows the library even when checking the account fails', async () => {
    mockServer({ check: { ok: false, status: 401, body: { error: 'Du må være logget inn' } } })
    renderPage()

    expect(await screen.findByText('Pannekaker')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toContain('feil 401')
    expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(3)
  })

  it('says so when the library itself cannot be loaded, instead of claiming it is empty', async () => {
    mockServer({ library: { ok: false, status: 500, body: {} } })
    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain('feil 500')
    expect(screen.queryByText('Biblioteket er tomt akkurat nå.')).toBeNull()
    expect(screen.getByText('Prøv igjen')).toBeTruthy()
  })

  it('says the library is empty only when it really is', async () => {
    mockServer({ library: ok({ blueprints: [] }) })
    renderPage()

    expect(await screen.findByText('Biblioteket er tomt akkurat nå.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('marks blueprints the family already has and links to that recipe', async () => {
    mockServer({ check: ok({ added: { b: 'r9' } }) })
    renderPage()

    await waitFor(() => expect(screen.getAllByText('Lagt til')).toHaveLength(1))
    expect(screen.getAllByText('Legg til i mine oppskrifter')).toHaveLength(2)
    expect(screen.getByText('Åpne oppskriften').closest('a')?.getAttribute('href')).toBe('/recipes/r9')
  })

  it('adds a recipe, shows it as added and confirms with a toast', async () => {
    const calls = mockServer({ add: ok({ recipe: { id: 'new1' } }) })
    renderPage()

    await screen.findByText('Pannekaker')
    await waitFor(() => expect(calls.some(call => call.url === '/api/blueprints')).toBe(true))
    fireEvent.click(screen.getAllByText('Legg til i mine oppskrifter')[0])

    await waitFor(() => expect(screen.getAllByText('Lagt til')).toHaveLength(1))
    expect(screen.getByText('«Pannekaker» er lagt til i oppskriftene dine')).toBeTruthy()
    expect(JSON.parse(calls.find(call => call.method === 'POST')!.body!)).toEqual({ blueprintId: 'a' })
    expect(screen.getByText('Åpne oppskriften').closest('a')?.getAttribute('href')).toBe('/recipes/new1')
  })

  it('shows the server message when adding fails', async () => {
    mockServer({ add: { ok: false, status: 500, body: { error: 'Kunne ikke legge til oppskriften' } } })
    renderPage()

    await screen.findByText('Pannekaker')
    fireEvent.click(screen.getAllByText('Legg til i mine oppskrifter')[0])

    expect(await screen.findByText('Kunne ikke legge til oppskriften')).toBeTruthy()
    expect(screen.queryByText('Lagt til')).toBeNull()
  })
})
