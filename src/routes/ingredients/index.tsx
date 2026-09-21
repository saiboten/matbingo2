import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { AISLE_ORDER, AISLE_LABELS, type Aisle } from '../../lib/aisle'
import { Search } from 'lucide-react'

interface IngredientRow {
  id: string
  name: string
  aisle: Aisle
}

export const Route = createFileRoute('/ingredients/')({
  component: IngredientsPage,
})

function IngredientsPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    }
  }, [isPending, session, navigate])

  useEffect(() => {
    if (!session?.user.familyId) return

    const fetchIngredients = async () => {
      try {
        const response = await fetch(`/api/ingredient-aisles?familyId=${session.user.familyId}`)
        const data = await response.json()
        setIngredients(data.ingredients || [])
      } catch (error) {
        console.error('Error fetching ingredients:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchIngredients()
  }, [session])

  const handleChangeAisle = async (id: string, aisle: Aisle) => {
    if (!session?.user.familyId) return

    const previous = ingredients.find(i => i.id === id)?.aisle
    const setAisle = (value: Aisle) =>
      setIngredients(prev => prev.map(i => (i.id === id ? { ...i, aisle: value } : i)))

    // Optimistic update, rolled back if the save fails
    setAisle(aisle)
    try {
      const response = await fetch('/api/ingredient-aisles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: session.user.familyId, id, aisle })
      })
      if (!response.ok && previous) setAisle(previous)
    } catch (error) {
      console.error('Error updating aisle:', error)
      if (previous) setAisle(previous)
    }
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
  }

  const needle = query.trim().toLowerCase()
  const visible = needle
    ? ingredients.filter(i => i.name.toLowerCase().includes(needle))
    : ingredients

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Ingredienser</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Velg hvilken hylle hver ingrediens hører til. Nye handlelister sorteres etter dette.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Søk i ingredienser ..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">
          {ingredients.length === 0 ? 'Ingen ingredienser ennå.' : 'Fant ingen ingredienser.'}
        </p>
      ) : (
        <div>
          {AISLE_ORDER.map(aisle => {
            const aisleItems = visible.filter(i => i.aisle === aisle)
            if (aisleItems.length === 0) return null
            return (
              <section key={aisle}>
                <h2 className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mx-0 sm:rounded-md">
                  {AISLE_LABELS[aisle]}
                  <span className="font-normal">{aisleItems.length}</span>
                </h2>
                <ul className="divide-y">
                  {aisleItems.map(item => (
                    <li key={item.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words font-medium">{item.name}</span>
                      <Select
                        value={item.aisle}
                        onValueChange={(value) => handleChangeAisle(item.id, value as Aisle)}
                      >
                        <SelectTrigger className="w-44 shrink-0 sm:w-56" aria-label={`Hylle for ${item.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AISLE_ORDER.map(option => (
                            <SelectItem key={option} value={option}>
                              {AISLE_LABELS[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
