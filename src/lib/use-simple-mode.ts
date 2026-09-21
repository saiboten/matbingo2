import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useSession } from './auth-client'

// What the server says the user gets by default (everyone but the family owner gets the simple mode)
// is fetched once per user and shared by everything that asks (header, guard, pages)
const answers = new Map<string, Promise<boolean>>()

function fetchSimple(key: string): Promise<boolean> {
  let answer = answers.get(key)
  if (!answer) {
    answer = fetch('/api/simple-mode')
      .then(response => (response.ok ? response.json() : { simple: false }))
      .then(data => data.simple === true)
      .catch(() => false)
    answers.set(key, answer)
  }
  return answer
}

// A chosen mode (from the switch button) is kept in this browser, per user, and wins over the default
const listeners = new Set<() => void>()
const storageKey = (userId: string) => `matbingo-view-mode:${userId}`
// Backup for when the browser will not store anything: the choice then lasts until the page is reloaded
const memory = new Map<string, 'simple' | 'full'>()

export function readChosenMode(userId: string): 'simple' | 'full' | null {
  try {
    const value = localStorage.getItem(storageKey(userId))
    if (value === 'simple' || value === 'full') return value
  } catch {
    // fall through to the in-memory choice
  }
  return memory.get(userId) ?? null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

// The default view for the user (true = simple), null while it is being looked up
function useDefaultSimple(key: string | null): boolean | null {
  const [known, setKnown] = useState<{ key: string; simple: boolean } | null>(null)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    fetchSimple(key).then(simple => {
      if (!cancelled) setKnown({ key, simple })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return key && known?.key === key ? known.simple : null
}

// The view in use (true = simple) and a way to switch it. The choice is remembered in this browser;
// until there is one, the owner of the family gets the full view and everyone else the simple one.
// `simple` is null while unknown, or when there is no user with a family.
export function useViewMode(): { simple: boolean | null; setSimple: (simple: boolean) => void } {
  const { data: session } = useSession()
  const userId = session?.user.id
  const familyId = session?.user.familyId
  const key = userId && familyId ? `${userId}:${familyId}` : null
  const byDefault = useDefaultSimple(key)

  const chosen = useSyncExternalStore(
    subscribe,
    () => (userId ? readChosenMode(userId) : null),
    () => null
  )

  const setSimple = useCallback(
    (simple: boolean) => {
      if (!userId) return
      memory.set(userId, simple ? 'simple' : 'full')
      try {
        localStorage.setItem(storageKey(userId), simple ? 'simple' : 'full')
      } catch {
        // Blocked storage: the in-memory choice above still applies
      }
      listeners.forEach(listener => listener())
    },
    [userId]
  )

  if (!key) return { simple: null, setSimple }
  if (chosen) return { simple: chosen === 'simple', setSimple }
  return { simple: byDefault, setSimple }
}

// Whether the view in use is the simple one: true or false once known, null while it is being looked up
export function useSimpleMode(): boolean | null {
  return useViewMode().simple
}
