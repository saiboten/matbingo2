import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from './auth-client'
import type { ShoppingListItem } from '../types'

// The family's shopping list for a page: sends visitors without a session or family away, loads the
// list (the server brings the recipe items up to date first), and lets the page change it locally.
export function useFamilyList() {
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

  return { familyId, ready: !isPending && !loading, items, setItems, failed, load, addItem }
}
