import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { formatDate } from '../../lib/utils'
import { AISLE_ORDER, AISLE_LABELS } from '../../lib/aisle'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import type { ShoppingList } from '../../types'

export const Route = createFileRoute('/shopping-lists/$listId')({
  component: ShoppingListPage,
})

function ShoppingListPage() {
  const { listId } = useParams({ from: '/shopping-lists/$listId' })
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [hideChecked, setHideChecked] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (!session?.user.familyId) return

    const fetchList = async () => {
      try {
        const response = await fetch(`/api/shopping-lists/${listId}?familyId=${session.user.familyId}`)
        if (response.ok) {
          const data = await response.json()
          setList(data.shoppingList)
        }
      } catch (error) {
        console.error('Error fetching shopping list:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchList()
  }, [session, listId])

  const handleToggleItem = async (itemId: string, checked: boolean) => {
    if (!session?.user.familyId) return

    const setChecked = (value: boolean) =>
      setList(prev =>
        prev && {
          ...prev,
          items: prev.items?.map(item => (item.id === itemId ? { ...item, checked: value } : item))
        }
      )

    // Optimistic update, rolled back if the save fails
    setChecked(checked)
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: session.user.familyId, itemId, checked })
      })
      if (!response.ok) setChecked(!checked)
    } catch (error) {
      console.error('Error updating item:', error)
      setChecked(!checked)
    }
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <p>Fant ikke handlelisten.</p>
        <Button asChild variant="outline">
          <Link to="/">Tilbake til ukesmenyen</Link>
        </Button>
      </div>
    )
  }

  const items = list.items ?? []
  const checkedCount = items.filter(item => item.checked).length
  const visibleItems = hideChecked ? items.filter(item => !item.checked) : items

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tilbake til ukesmenyen
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Handleliste</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Laget {formatDate(new Date(list.createdAt))} for{' '}
          {list.dates.map(d => formatDate(new Date(d))).join(', ')}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {checkedCount} av {items.length} varer krysset av
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-w-44 shrink-0 justify-center"
          disabled={checkedCount === 0}
          onClick={() => setHideChecked(h => !h)}
        >
          {hideChecked ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
          {hideChecked ? `Vis avkryssede (${checkedCount})` : 'Skjul avkryssede'}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ingen ingredienser i denne listen.</p>
      ) : visibleItems.length === 0 ? (
        <p className="text-muted-foreground">Alle varer er krysset av.</p>
      ) : (
        <div>
          {AISLE_ORDER.map(aisle => {
            const aisleItems = visibleItems.filter(item => item.aisle === aisle)
            if (aisleItems.length === 0) return null
            return (
              <section key={aisle}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {AISLE_LABELS[aisle]}
                  <span className="font-normal">{aisleItems.length}</span>
                </h2>
                <ul className="divide-y">
                  {aisleItems.map(item => (
                    <li key={item.id}>
                      <label className="flex min-h-14 cursor-pointer items-center gap-4 py-3 active:bg-muted/60">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(value) => handleToggleItem(item.id, value === true)}
                          className="h-6 w-6 shrink-0 [&_svg]:h-5 [&_svg]:w-5"
                        />
                        <div className={`min-w-0 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          <p className="break-words text-base font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">fra: {item.sources.join(', ')}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Havner en vare i feil gang?{' '}
        <Link to="/ingredients" className="text-primary hover:underline">
          Rediger ingrediensene
        </Link>
      </p>
    </div>
  )
}
