import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useSimpleMode } from '../lib/use-simple-mode'

// The pages a user in the simple mode may open; everything else leads back to the list
export const SIMPLE_MODE_PATHS = ['/shopping-lists/common-items', '/settings', '/login']

export function isAllowedInSimpleMode(pathname: string): boolean {
  // The list itself is the home page, so only "/" exactly, not everything under it
  if (pathname === '/') return true
  return SIMPLE_MODE_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

export default function SimpleModeGuard() {
  const simple = useSimpleMode()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const navigate = useNavigate()

  useEffect(() => {
    if (simple && !isAllowedInSimpleMode(pathname)) navigate({ to: '/', replace: true })
  }, [simple, pathname, navigate])

  return null
}
