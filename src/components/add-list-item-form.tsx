import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { AISLE_LABELS, type Aisle } from '../lib/aisle'
import { cn } from '../lib/utils'

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
  // Puts the item on the list (showing it at once) and resolves to whether it was saved. `aisle` is
  // the shelf to show it on; it is only sent to the server when `sendAisle` is set.
  onAdd: (input: { name: string; aisle?: Aisle; sendAisle?: boolean }) => Promise<boolean>
  placeholder?: string
  label?: string
}

// One-line form that adds an item to the family's shopping list. While typing, the ingredients the family
// knows are offered, so the item lands on the right shelf. The last option adds the text as typed,
// on the «Annet» shelf.
export function AddListItemForm({ onAdd, placeholder = 'Legg til en vare ...', label = 'Ny vare' }: AddListItemFormProps) {
  const [name, setName] = useState('')
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

  // The item goes on the list at once (the page saves it in the background), so the field is
  // cleared straight away and the next item can be typed
  const add = (itemName: string, aisle: Aisle | undefined, sendAisle: boolean) => {
    if (!itemName) return
    setName('')
    setOpen(false)
    onAdd({ name: itemName, aisle, sendAisle }).then(saved => {
      if (!saved) return
      // A new name is now known to the family, with its shelf
      knownCache = null
      loadKnown().then(setKnown)
    })
  }

  // A known ingredient is added by name (the server uses the family's shelf, shown meanwhile);
  // anything else goes to «Annet»
  const choose = (index: number) => {
    const picked = suggestions[index]
    if (picked) add(picked.name, picked.aisle, false)
    else add(typed, 'OTHER', true)
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
      <Button type="submit" disabled={!typed}>
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
