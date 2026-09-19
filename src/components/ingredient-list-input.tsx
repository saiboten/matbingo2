import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { addIngredient, findExisting, normalizeIngredient } from '../lib/ingredient-text'

interface IngredientListInputProps {
  value: string[]
  onChange: (value: string[]) => void
  // Ingredients the family already uses; typed names that match are reused as-is
  options: string[]
  id?: string
  className?: string
}

// A list of ingredients with a free-text field to add more. Typing suggests existing
// ingredients; a name that matches none of them is added as a new ingredient.
export function IngredientListInput({ value, onChange, options, id, className }: IngredientListInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const needle = normalizeIngredient(query).toLowerCase()
  const inList = new Set(value.map(item => item.toLowerCase()))
  const suggestions = options.filter(
    option => !inList.has(option.toLowerCase()) && option.toLowerCase().includes(needle)
  )
  const exact = needle ? findExisting(needle, options) : undefined
  // Offered as the last row when what was typed is not an existing ingredient
  const showAddNew = needle !== '' && !exact && !inList.has(needle)
  const rowCount = suggestions.length + (showAddNew ? 1 : 0)

  const add = (text: string) => {
    onChange(addIngredient(value, text, options))
    setQuery('')
    setActive(-1)
  }

  const remove = (item: string) => onChange(value.filter(v => v !== item))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      // Never submit the surrounding form from here
      e.preventDefault()
      if (active >= 0 && active < suggestions.length) add(suggestions[active])
      else add(query)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(a => (rowCount === 0 ? -1 : Math.min(a + 1, rowCount - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node | null)) return
    setOpen(false)
    // Don't lose a name that was typed but never confirmed
    if (query.trim()) add(query)
  }

  return (
    <div ref={containerRef} className={cn('space-y-3', className)}>
      {value.length > 0 && (
        <ul className="divide-y rounded-md border">
          {value.map(item => (
            <li key={item} className="flex min-h-11 items-center justify-between gap-2 pl-3 pr-1">
              <span className="min-w-0 break-words">{item}</span>
              <button
                type="button"
                onClick={() => remove(item)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fjern {item}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Legg til ingrediens ..."
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />

        {open && rowCount > 0 && (
          <div
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            // Keep focus in the input so choosing a row doesn't trigger the blur handler first
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((option, index) => (
              <button
                type="button"
                key={option}
                onClick={() => add(option)}
                className={cn(
                  'flex min-h-11 w-full items-center px-3 py-2 text-left text-sm hover:bg-accent',
                  active === index && 'bg-accent'
                )}
              >
                {option}
              </button>
            ))}
            {showAddNew && (
              <button
                type="button"
                onClick={() => add(query)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 border-t px-3 py-2 text-left text-sm hover:bg-accent',
                  active === suggestions.length && 'bg-accent'
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  Legg til «{normalizeIngredient(query)}» som ny ingrediens
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
