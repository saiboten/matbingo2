// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'

const navigate = vi.fn()
let pathname = '/'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { pathname } }),
}))
vi.mock('../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'guard-user', familyId: 'f1' } }, isPending: false }),
}))

const { default: SimpleModeGuard, isAllowedInSimpleMode } = await import('./SimpleModeGuard')

afterEach(() => {
  cleanup()
  navigate.mockReset()
  vi.unstubAllGlobals()
})

describe('simple mode guard', () => {
  it('allows the list, the everyday items and the settings, and nothing else', () => {
    for (const path of ['/', '/shopping-lists/common-items', '/settings']) expect(isAllowedInSimpleMode(path)).toBe(true)
    for (const path of ['/meal-plan', '/recipes', '/ingredients', '/admin/blueprints']) expect(isAllowedInSimpleMode(path)).toBe(false)
  })

  it('sends a simple-mode user from any other page to the list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ simple: true }) })))
    pathname = '/meal-plan'
    render(<SimpleModeGuard />)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true }))
  })

  it('leaves a simple-mode user alone on the list', async () => {
    pathname = '/'
    render(<SimpleModeGuard />)
    // the answer is cached from the previous test; give the hook time to apply it
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(navigate).not.toHaveBeenCalled()
  })
})
