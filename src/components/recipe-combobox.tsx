import { useEffect, useMemo, useRef, useState } from 'react'
import { Utensils, Search } from 'lucide-react'
import { Badge } from './ui/badge'
import { recipeImageUrl } from '../lib/recipe-image'
import { DISH_TYPE_LABELS } from '../types'
import type { Recipe } from '../types'
import { cn } from '../lib/utils'

interface RecipeComboboxProps {
  recipes: Recipe[]
  onSelect: (recipe: Recipe) => void
  placeholder?: string
  className?: string
}

// A search box with a list of matching recipes underneath: type to narrow down, then pick one
// with the mouse, a tap, or the arrow keys and Enter.
export function RecipeCombobox({ recipes, onSelect, placeholder = 'Søk etter oppskrift ...', className }: RecipeComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return recipes
      .filter(recipe => recipe.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
  }, [recipes, query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Keep the highlighted row in view while moving with the arrow keys
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && matches[active]) {
      e.preventDefault()
      onSelect(matches[active])
    } else if (e.key === 'Escape' && open) {
      // Close the list first; the dialog itself stays open
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="recipe-combobox-list"
          aria-label="Søk etter oppskrift"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          // Not on focus: the dialog focuses the box when it opens, and the list should stay closed until asked for
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {open && (
        <ul
          id="recipe-combobox-list"
          ref={listRef}
          role="listbox"
          className="max-h-64 overflow-y-auto rounded-md border bg-popover"
        >
          {matches.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Fant ingen oppskrifter</li>
          ) : (
            matches.map((recipe, index) => (
              <li
                key={recipe.id}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => onSelect(recipe)}
                className={cn('flex cursor-pointer items-center gap-3 px-3 py-2', index === active && 'bg-accent')}
              >
                {recipeImageUrl(recipe) ? (
                  <img src={recipeImageUrl(recipe)!} loading="lazy" decoding="async" alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                    <Utensils className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{recipe.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {DISH_TYPE_LABELS[recipe.type]}
                  </Badge>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
