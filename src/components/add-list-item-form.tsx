import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useToast } from './ui/toast'
import type { ShoppingListItem } from '../types'

interface AddListItemFormProps {
  listId: string
  // Called with the item the server returned (an existing one comes back un-crossed)
  onAdded: (item: ShoppingListItem) => void
  placeholder?: string
  label?: string
}

// One-line form that adds an item to a shopping list
export function AddListItemForm({ listId, onAdded, placeholder = 'Legg til en vare ...', label = 'Ny vare' }: AddListItemFormProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        onAdded(data.item)
        setName('')
      } else {
        toast(data.error || 'Kunne ikke legge til varen', 'error')
      }
    } catch (error) {
      console.error('Error adding item:', error)
      toast('Kunne ikke legge til varen', 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        handleAdd()
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} aria-label={label} maxLength={100} />
      <Button type="submit" disabled={adding || !name.trim()}>
        <Plus className="mr-1 h-4 w-4" />
        Legg til
      </Button>
    </form>
  )
}
