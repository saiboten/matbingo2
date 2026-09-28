// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from './ui/toast'

const navigate = vi.fn()
const SESSION = { data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useNavigate: () => navigate,
  }
})
vi.mock('../lib/auth-client', () => ({ useSession: () => SESSION }))

const { BasketEditor } = await import('./basket-editor')

const COMMON = [
  { id: 'x', name: 'Melk', aisle: 'CHILLED' },
  { id: 'y', name: 'Yoghurt', aisle: 'CHILLED' },
  { id: 'z', name: 'Brød', aisle: 'BAKERY' },
]

function mockServer(basket?: { name: string; items: string[] }) {
  const calls: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body as string | undefined })
      if (url === '/api/common-items') return { ok: true, status: 200, json: async () => ({ items: COMMON }) }
      if (url === '/api/baskets/B1' && method === 'GET') return { ok: true, status: 200, json: async () => ({ basket: { id: 'B1', ...basket } }) }
      return { ok: true, status: 200, json: async () => ({ basket: { id: 'B1', name: 'Ukeshandel', items: [] }, success: true }) }
    })
  )
  return calls
}

const renderEditor = (basketId?: string) => render(<ToastProvider><BasketEditor basketId={basketId} /></ToastProvider>)

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
})

describe('making a basket', () => {
  it('picks several everyday items with a tap each, adds a typed one, and saves', async () => {
    const calls = mockServer()
    renderEditor()
    fireEvent.click(await screen.findByRole('button', { name: 'Melk' }))
    fireEvent.click(screen.getByRole('button', { name: 'Brød' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yoghurt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yoghurt' }))
    fireEvent.change(screen.getByLabelText('Annen vare'), { target: { value: ' Kattemat ' } })
    fireEvent.click(screen.getByRole('button', { name: /Legg til/ }))

    const save = screen.getByRole('button', { name: /Lagre kurven \(3 varer\)/ }) as HTMLButtonElement
    expect(save.disabled).toBe(true) // no name yet
    fireEvent.change(screen.getByLabelText('Navn'), { target: { value: 'Ukeshandel' } })
    fireEvent.click(save)

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
    const post = calls.find(call => call.method === 'POST')!
    expect(post.url).toBe('/api/baskets')
    expect(JSON.parse(post.body!)).toEqual({ name: 'Ukeshandel', items: ['Melk', 'Brød', 'Kattemat'] })
  })
})

describe('changing a basket', () => {
  it('starts with the basket as saved, and saves the changes', async () => {
    const calls = mockServer({ name: 'Helg', items: ['Melk', 'Chips'] })
    renderEditor('B1')
    expect(await screen.findByDisplayValue('Helg')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Melk' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Chips')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Fjern Chips' }))
    fireEvent.click(screen.getByRole('button', { name: /Lagre kurven \(1 vare\)/ }))
    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true))
    expect(JSON.parse(calls.find(call => call.method === 'PUT')!.body!)).toEqual({ name: 'Helg', items: ['Melk'] })
  })

  it('asks once more before deleting', async () => {
    const calls = mockServer({ name: 'Helg', items: ['Melk'] })
    renderEditor('B1')
    fireEvent.click(await screen.findByRole('button', { name: /Slett kurven/ }))
    expect(calls.some(call => call.method === 'DELETE')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /Ja, slett kurven/ }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
    expect(calls.find(call => call.method === 'DELETE')!.url).toBe('/api/baskets/B1')
  })
})
