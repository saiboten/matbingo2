import { useEffect, useRef, useState } from 'react'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

interface IngredientMultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function IngredientMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Velg ingredienser ...',
  className
}: IngredientMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter(s => s !== option)
        : [...selected, option]
    )
  }

  const remove = (option: string) => {
    onChange(selected.filter(s => s !== option))
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm cursor-text"
        onClick={() => setOpen(true)}
      >
        {selected.map(s => (
          <Badge key={s} variant="secondary" className="gap-1">
            {s}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(s)
              }}
              className="rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Fjern {s}</span>
            </button>
          </Badge>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Fant ingen ingredienser</p>
          ) : (
            filtered.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => toggle(option)}
                />
                {option}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
