import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useToast } from './ui/toast'
import { AISLE_LABELS, type Aisle } from '../lib/aisle'
import { cn } from '../lib/utils'
import type { ShoppingListItem } from '../types'

interface KnownIngredient {
  name: string
  aisle: Aisle
}

// The family's known ingredients are fetched once and shared by every form on the page; forgotten
// after an add, since that can make a new name known
let knownCache: Promise<KnownIngredient[]> | null = null

function loadKnown(): Promise<KnownIngredient[]> {
  if (!knownCache) {
    knownCache = fetch('/api/known-ingredients')
      .then(response => (response.ok ? response.json() : { ingredients: [] }))
      .then(data => (Array.isArray(data.ingredients) ? data.ingredients : []))
      .catch(() => [])
  }
  return knownCache
}

const MAX_SUGGESTIONS = 8

interface AddListItemFormProps {
  listId: string
  // Called with the item the server returned (an existing one comes back un-crossed)
  onAdded: (item: ShoppingListItem) => void
  placeholder?: string
  label?: string
}

// One-line form that adds an item to a shopping list. While typing, the ingredients the family
// knows are offered, so the item lands on the right shelf. The last option adds the text as typed,
// on the «Annet» shelf.
export function AddListItemForm({ listId, onAdded, placeholder = 'Legg til en vare ...', label = 'Ny vare' }: AddListItemFormProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [known, setKnown] = useState<KnownIngredient[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let cancelled = false
    loadKnown().then(list => !cancelled && setKnown(list))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const typed = name.replace(/\s+/g, ' ').trim()
  const suggestions = useMemo(() => {
    const needle = typed.toLowerCase()
    if (!needle) return []
    const matches = known.filter(item => item.name.toLowerCase().includes(needle))
    // Names starting with the text first
    matches.sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)))
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [known, typed])

  // The rows in the list: the known ingredients, then «add as typed» (unless the text is exactly a known one)
  const exact = suggestions.findIndex(item => item.name.toLowerCase() === typed.toLowerCase())
  const showAddRow = typed !== '' && exact === -1
  const rowCount = suggestions.length + (showAddRow ? 1 : 0)

  // What Enter does without moving: the exact match if there is one, else adding the text as typed
  useEffect(() => setActive(exact !== -1 ? exact : suggestions.length), [typed, exact, suggestions.length])

  const add = async (itemName: string, aisle?: Aisle) => {
    if (!itemName || adding) return
    setAdding(true)
    try {
      const response = await fetch(`/api/shopping-lists/${listId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: itemName, ...(aisle ? { aisle } : {}) })
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        onAdded(data.item)
        setName('')
        setOpen(false)
        knownCache = null
        loadKnown().then(setKnown)
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

  // A known ingredient is added by name (the server uses the family's shelf); anything else goes to «Annet»
  const choose = (index: number) => {
    const picked = suggestions[index]
    if (picked) add(picked.name)
    else add(typed, 'OTHER')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => Math.min(i + 1, rowCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape' && open) {
      setOpen(false)
    }
  }

  return (
    <form
      ref={containerRef}
      className="relative flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (rowCount > 0) choose(active)
      }}
    >
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        maxLength={100}
      />
      <Button type="submit" disabled={adding || !typed}>
        <Plus className="mr-1 h-4 w-4" />
        Legg til
      </Button>

      {open && rowCount > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-md">
          {suggestions.map((item, index) => (
            <li
              key={item.name}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2', index === active && 'bg-accent')}
            >
              <span className="min-w-0 break-words font-medium">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{AISLE_LABELS[item.aisle]}</span>
            </li>
          ))}
          {showAddRow && (
            <li
              role="option"
              aria-selected={active === suggestions.length}
              onMouseEnter={() => setActive(suggestions.length)}
              onClick={() => choose(suggestions.length)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2',
                suggestions.length > 0 && 'border-t',
                active === suggestions.length && 'bg-accent'
              )}
            >
              <span className="min-w-0 break-words font-medium">Legg til «{typed}»</span>
              <span className="shrink-0 text-xs text-muted-foreground">{AISLE_LABELS.OTHER}</span>
            </li>
          )}
        </ul>
      )}
    </form>
  )
}
