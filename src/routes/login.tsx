import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn, signUp, useSession } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { MAX_USERNAME_LENGTH, MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH, usernameEmail } from '../lib/username-account'
import { cn } from '../lib/utils'
import { ChefHat } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  beforeLoad: async () => {
    // We'll check session on client side
  },
})

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/

// Better Auth's error codes, in Norwegian
const ERRORS: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: 'Feil brukernavn eller passord',
  USERNAME_IS_ALREADY_TAKEN: 'Brukernavnet er tatt. Prøv et annet.',
  USER_ALREADY_EXISTS: 'Brukernavnet er tatt. Prøv et annet.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Brukernavnet er tatt. Prøv et annet.',
  USERNAME_TOO_SHORT: `Brukernavnet må ha minst ${MIN_USERNAME_LENGTH} tegn`,
  USERNAME_TOO_LONG: `Brukernavnet kan ha høyst ${MAX_USERNAME_LENGTH} tegn`,
  INVALID_USERNAME: 'Brukernavnet kan bare ha bokstaver (a–z), tall, punktum og understrek',
  PASSWORD_TOO_SHORT: `Passordet må ha minst ${MIN_PASSWORD_LENGTH} tegn`,
  PASSWORD_TOO_LONG: 'Passordet er for langt',
}

function errorMessage(error: { code?: string; status?: number } | null | undefined, fallback: string): string {
  if (error?.status === 429) return 'For mange forsøk. Vent litt og prøv igjen.'
  return (error?.code && ERRORS[error.code]) || fallback
}

// Checked here too, so the most common mistakes are explained before anything is sent
function validateSignUp(input: { name: string; username: string; password: string; repeat: string }): string | null {
  if (!input.name.trim()) return 'Skriv inn navnet ditt'
  if (input.username.length < MIN_USERNAME_LENGTH) return ERRORS.USERNAME_TOO_SHORT
  if (input.username.length > MAX_USERNAME_LENGTH) return ERRORS.USERNAME_TOO_LONG
  if (!USERNAME_PATTERN.test(input.username)) return ERRORS.INVALID_USERNAME
  if (input.password.length < MIN_PASSWORD_LENGTH) return ERRORS.PASSWORD_TOO_SHORT
  if (input.password !== input.repeat) return 'Passordene er ikke like'
  return null
}

export function LoginPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Redirect if already logged in
  if (session && !isPending) {
    throw redirect({ to: '/' })
  }

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next)
    setError(null)
    setPassword('')
    setRepeat('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim()
    setError(null)

    if (mode === 'signup') {
      const problem = validateSignUp({ name, username: cleanUsername, password, repeat })
      if (problem) {
        setError(problem)
        return
      }
    }

    setBusy(true)
    try {
      const result =
        mode === 'login'
          ? await signIn.username({ username: cleanUsername, password })
          : await signUp.email({
              email: usernameEmail(cleanUsername),
              name: name.trim(),
              username: cleanUsername,
              password,
            })
      if (result.error) {
        setError(errorMessage(result.error, mode === 'login' ? 'Kunne ikke logge inn' : 'Kunne ikke lage kontoen'))
        return
      }
      // A new account has no family yet; the home page sends it on to create or join one
      navigate({ to: '/' })
    } catch (err) {
      console.error('Error signing in:', err)
      setError('Ingen kontakt med serveren. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: '/'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ChefHat className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Matbingo</CardTitle>
          <CardDescription>
            Planlegg familiens middager med smarte forslag
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['login', 'signup'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => switchMode(tab)}
                className={cn(
                  'min-h-10 rounded-md text-sm font-medium transition-colors',
                  mode === tab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'login' ? 'Logg inn' : 'Lag konto'}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Navn</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Brukernavn</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={MAX_USERNAME_LENGTH}
              />
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">Bokstaver (a–z), tall, punktum og understrek.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && <p className="text-xs text-muted-foreground">Minst {MIN_PASSWORD_LENGTH} tegn.</p>}
            </div>
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="repeat">Gjenta passordet</Label>
                <Input id="repeat" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={busy || !username.trim() || !password}>
              {busy ? 'Vent litt ...' : mode === 'login' ? 'Logg inn' : 'Lag konto'}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            eller
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Fortsett med Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
