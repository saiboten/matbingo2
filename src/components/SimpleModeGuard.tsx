import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useSimpleMode } from '../lib/use-simple-mode'

// The pages a user in the simple mode may open; everything else leads back to the list
export const SIMPLE_MODE_PATHS = ['/simple', '/settings', '/login']

export function isAllowedInSimpleMode(pathname: string): boolean {
  return SIMPLE_MODE_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

export default function SimpleModeGuard() {
  const simple = useSimpleMode()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const navigate = useNavigate()

  useEffect(() => {
    if (simple && !isAllowedInSimpleMode(pathname)) navigate({ to: '/simple', replace: true })
  }, [simple, pathname, navigate])

  return null
}
