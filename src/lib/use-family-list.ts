import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from './auth-client'
import type { ShoppingListItem } from '../types'
import { guessAisle, type Aisle } from './aisle'
import { EXTRA_SOURCE } from './shopping-extras'
import { nameKey } from './shopping-lines'

// The family's shopping list for a page: sends visitors without a session or family away, loads the
// list (the server brings the recipe items up to date first), and lets the page change it locally.
export function useFamilyList({ onError }: { onError?: (message: string) => void } = {}) {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const familyId = session?.user.familyId

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  const load = async () => {
    setFailed(false)
    try {
      const response = await fetch('/api/shopping-list')
      if (response.ok) setItems((await response.json()).shoppingList?.items ?? [])
      else setFailed(true)
    } catch (error) {
      console.error('Error fetching shopping list:', error)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (familyId) load()
  }, [familyId])

  // An item that was already on the list comes back (unchecked) instead of being added twice
  const addItem = (item: ShoppingListItem) => setItems(prev => [...prev.filter(row => row.id !== item.id), item])

  // Adds an item by name at once and saves it in the background: a stand-in row is shown right away
  // (on the shelf given, else the family's or a guess) and swapped for the saved one, or taken off
  // again if saving fails. `aisle` is sent to the server only when `sendAisle` is set, so a known
  // ingredient keeps the family's shelf. Returns false if it failed.
  const addByName = async ({ name, aisle, sendAisle = false }: { name: string; aisle?: Aisle; sendAisle?: boolean }) => {
    const key = nameKey(name)
    if (items.some(item => !item.checked && nameKey(item.name) === key)) return true
    const temp = unsavedItem(name, aisle ?? items.find(item => nameKey(item.name) === key)?.aisle)
    const tempId = temp.id
    // A checked row of the same name comes back unchecked on the server; hide it meanwhile
    setItems(prev => [...prev.filter(item => nameKey(item.name) !== key || !item.checked), temp])
    try {
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...(sendAisle && aisle ? { aisle } : {}) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Kunne ikke legge til varen')
      // Also drops any other stand-in of the same name (added twice quickly); the server keeps one row
      setItems(prev => [...prev.filter(item => item.id !== data.item.id && !(isUnsaved(item) && nameKey(item.name) === key)), data.item])
      return true
    } catch (error) {
      console.error('Error adding item:', error)
      setItems(prev => prev.filter(item => item.id !== tempId))
      onError?.(error instanceof Error ? error.message : 'Kunne ikke legge til varen')
      await load()
      return false
    }
  }

  // Takes rows off at once and deletes them in the background; puts back what could not be deleted
  const removeRows = async (rows: ShoppingListItem[]) => {
    const ids = new Set(rows.map(row => row.id))
    setItems(prev => prev.filter(item => !ids.has(item.id)))
    const results = await Promise.all(
      rows.map(row =>
        fetch(`/api/shopping-list?itemId=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
          .then(response => response.ok)
          .catch(() => false)
      )
    )
    const kept = rows.filter((_, i) => !results[i])
    if (kept.length > 0) {
      setItems(prev => [...prev, ...kept])
      onError?.('Kunne ikke fjerne varen')
    }
  }

  return { familyId, ready: !isPending && !loading, items, setItems, failed, load, addItem, addByName, removeRows }
}

// Rows shown before the server has saved them; they cannot be changed until it has
const TEMP_PREFIX = 'pending-'
let tempCounter = 0
export const isUnsaved = (item: ShoppingListItem) => item.id.startsWith(TEMP_PREFIX)

// A stand-in row for an item added by hand, on the shelf given or a guessed one
export function unsavedItem(name: string, aisle?: Aisle): ShoppingListItem {
  return {
    id: `${TEMP_PREFIX}${++tempCounter}`,
    shoppingListId: '',
    name,
    aisle: aisle ?? guessAisle(name),
    checked: false,
    sources: [EXTRA_SOURCE],
    mealDate: null,
  }
}
