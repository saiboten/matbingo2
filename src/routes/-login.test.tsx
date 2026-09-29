// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigate = vi.fn()
const signInUsername = vi.fn()
const signUpEmail = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  redirect: (options: unknown) => options,
  useNavigate: () => navigate,
}))
vi.mock('../lib/auth-client', () => ({
  useSession: () => ({ data: null, isPending: false }),
  signIn: { username: signInUsername, social: vi.fn() },
  signUp: { email: signUpEmail },
}))

const { LoginPage } = await import('./login')

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('logging in with a username', () => {
  it('signs in and goes to the shopping list', async () => {
    signInUsername.mockResolvedValue({ data: {}, error: null })
    render(<LoginPage />)
    type('Brukernavn', ' ola ')
    type('Passord', 'hemmelig123')
    fireEvent.click(screen.getByRole('button', { name: 'Logg inn' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
    expect(signInUsername).toHaveBeenCalledWith({ username: 'ola', password: 'hemmelig123' })
  })

  it('explains a wrong username or password in Norwegian', async () => {
    signInUsername.mockResolvedValue({ data: null, error: { code: 'INVALID_USERNAME_OR_PASSWORD', status: 401 } })
    render(<LoginPage />)
    type('Brukernavn', 'ola')
    type('Passord', 'feil')
    fireEvent.click(screen.getByRole('button', { name: 'Logg inn' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Feil brukernavn eller passord')
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('making an account', () => {
  const openSignUp = () => fireEvent.click(screen.getByRole('tab', { name: 'Lag konto' }))

  it('creates a username account with its made-up email', async () => {
    signUpEmail.mockResolvedValue({ data: {}, error: null })
    render(<LoginPage />)
    openSignUp()
    type('Navn', 'Ola Nordmann')
    type('Brukernavn', 'ola')
    type('Passord', 'hemmelig123')
    type('Gjenta passordet', 'hemmelig123')
    fireEvent.click(screen.getByRole('button', { name: 'Lag konto' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/' }))
    expect(signUpEmail).toHaveBeenCalledWith({
      email: 'ola@brukernavn.matbingo.invalid',
      name: 'Ola Nordmann',
      username: 'ola',
      password: 'hemmelig123',
    })
  })

  it('checks the form before sending it', () => {
    render(<LoginPage />)
    openSignUp()
    type('Navn', 'Ola')
    type('Brukernavn', 'ola nordmann')
    type('Passord', 'hemmelig123')
    type('Gjenta passordet', 'hemmelig123')
    fireEvent.click(screen.getByRole('button', { name: 'Lag konto' }))
    expect(screen.getByRole('alert').textContent).toMatch(/bare ha bokstaver/)

    type('Brukernavn', 'ola')
    type('Gjenta passordet', 'annet12345')
    fireEvent.click(screen.getByRole('button', { name: 'Lag konto' }))
    expect(screen.getByRole('alert').textContent).toBe('Passordene er ikke like')
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it('says so when the username is taken', async () => {
    signUpEmail.mockResolvedValue({ data: null, error: { code: 'USERNAME_IS_ALREADY_TAKEN', status: 422 } })
    render(<LoginPage />)
    openSignUp()
    type('Navn', 'Ola')
    type('Brukernavn', 'ola')
    type('Passord', 'hemmelig123')
    type('Gjenta passordet', 'hemmelig123')
    fireEvent.click(screen.getByRole('button', { name: 'Lag konto' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Brukernavnet er tatt. Prøv et annet.')
  })
})
