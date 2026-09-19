import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Card, CardContent } from '../../components/ui/card'
import { formatDate } from '../../lib/utils'
import type { ShoppingList } from '../../types'

export const Route = createFileRoute('/shopping-lists/')({
  component: ShoppingListsPage,
})

function ShoppingListsPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (!session?.user.familyId) return

    const fetchLists = async () => {
      try {
        const response = await fetch(`/api/shopping-lists?familyId=${session.user.familyId}`)
        const data = await response.json()
        setLists(data.shoppingLists || [])
      } catch (error) {
        console.error('Error fetching shopping lists:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLists()
  }, [session])

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Handlelister</h1>
      {lists.length === 0 ? (
        <p className="text-muted-foreground">
          Ingen handlelister ennå. Bruk «Lag handleliste» på ukesmenyen for å lage en.
        </p>
      ) : (
        <div className="space-y-2">
          {lists.map(list => (
            <Link key={list.id} to="/shopping-lists/$listId" params={{ listId: list.id }}>
              <Card className="hover:bg-muted">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium">{formatDate(new Date(list.createdAt))}</span>
                  <span className="text-sm text-muted-foreground">
                    {list._count?.items ?? 0} varer
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/ingredients" className="text-primary hover:underline">
          Rediger hvilken gang ingrediensene hører til
        </Link>
      </p>
    </div>
  )
}
