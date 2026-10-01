// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../components/ui/toast'

vi.mock('@tanstack/react-router', async () => {
  const React = await import('react')
  return {
    createFileRoute: () => (options: unknown) => options,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useNavigate: () => vi.fn(),
  }
})
vi.mock('../../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', familyId: 'f1' } }, isPending: false }),
}))

const { CommonItemsPage } = await import('./common-items')

const ITEMS = [
  { id: 'x', name: 'Egg', aisle: 'CHILLED' },
  { id: 'y', name: 'Melk', aisle: 'CHILLED' },
]

// The server answers reads at once; writes wait until `answer` is called (with ok or not)
function mockServer() {
  const pending: { method: string; body: string; resolve: (ok: boolean) => void }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (url === '/api/common-items' && method === 'GET') return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: ITEMS }) })
      if (url === '/api/common-items') {
        const body = init!.body as string
        return new Promise(resolve =>
          pending.push({
            method,
            body,
            resolve: ok =>
              resolve({
                ok,
                status: ok ? 200 : 500,
                json: async () => (ok ? { item: { id: 'saved', name: JSON.parse(body).name, aisle: 'DRY' } } : { error: 'Kunne ikke lagre' }),
              }),
          })
        )
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    })
  )
  return pending
}

const names = () => screen.getAllByText(/^(Egg|Melk|Ris|Kaffe)$/).map(node => node.textContent)
const renderPage = () => render(<ToastProvider><CommonItemsPage /></ToastProvider>)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('everyday items', () => {
  it('shows a new item at once, before the server has answered', async () => {
    const pending = mockServer()
    renderPage()
    await screen.findByText('Melk')

    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'Ris' } })
    fireEvent.submit(screen.getByLabelText('Ny vare').closest('form')!)
    expect(names()).toContain('Ris')
    expect((screen.getByLabelText('Ny vare') as HTMLInputElement).value).toBe('')
    // not removable until it is saved
    expect((screen.getByRole('button', { name: 'Fjern Ris' }) as HTMLButtonElement).disabled).toBe(true)

    pending[0].resolve(true)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Fjern Ris' }) as HTMLButtonElement).disabled).toBe(false))
    expect(JSON.parse(pending[0].body)).toEqual({ name: 'Ris' })
  })

  it('takes a new item off again, and says so, when it cannot be saved', async () => {
    const pending = mockServer()
    renderPage()
    await screen.findByText('Melk')

    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'Kaffe' } })
    fireEvent.submit(screen.getByLabelText('Ny vare').closest('form')!)
    expect(names()).toContain('Kaffe')
    pending[0].resolve(false)
    expect(await screen.findByText('Kunne ikke lagre')).toBeTruthy()
    expect(names()).not.toContain('Kaffe')
  })

  it('does not add an item that is already there', async () => {
    const pending = mockServer()
    renderPage()
    await screen.findByText('Melk')
    fireEvent.change(screen.getByLabelText('Ny vare'), { target: { value: 'melk' } })
    fireEvent.submit(screen.getByLabelText('Ny vare').closest('form')!)
    expect(await screen.findByText('«Melk» er allerede i listen')).toBeTruthy()
    expect(pending).toHaveLength(0)
  })

  it('removes an item at once, and puts it back when that fails', async () => {
    const pending = mockServer()
    renderPage()
    await screen.findByText('Melk')

    fireEvent.click(screen.getByRole('button', { name: 'Fjern Melk' }))
    expect(names()).toEqual(['Egg'])
    pending[0].resolve(false)
    await waitFor(() => expect(names()).toEqual(['Egg', 'Melk']))
    expect(screen.getByText('Kunne ikke fjerne Melk')).toBeTruthy()
  })
})
