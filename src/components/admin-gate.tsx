import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '../lib/auth-client'
import { isSuperAdmin } from '../lib/super-admin'
import { Skeleton } from './ui/skeleton'

// Only shows its children to the super admin. This just decides what the page shows: the admin API
// checks the user again on the server for every call.
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [isPending, session, navigate])

  if (isPending || !session) {
    return (
      <div className="max-w-3xl space-y-4" aria-busy="true" aria-label="Laster">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!isSuperAdmin(session.user.email)) {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold">Ingen tilgang</h1>
        <p className="text-muted-foreground">Denne siden er bare for superadministrator.</p>
      </div>
    )
  }

  return <>{children}</>
}
