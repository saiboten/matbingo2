import { useEffect, useState } from 'react'
import { useSession } from './auth-client'

// The answer is fetched once per user and shared by everything that asks (header, guard, pages)
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

// Whether the signed-in user gets the simple mode (everyone but the family owner): true or false once
// known, null while it is being looked up or when there is no user with a family
export function useSimpleMode(): boolean | null {
  const { data: session } = useSession()
  const userId = session?.user.id
  const familyId = session?.user.familyId
  const key = userId && familyId ? `${userId}:${familyId}` : null
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
