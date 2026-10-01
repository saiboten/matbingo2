import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useToast } from './ui/toast'
import { MAX_AISLE_NAME_LENGTH, type Aisle } from '../lib/aisle'
import { createAisle, useAisles } from '../lib/use-aisles'

const NEW_AISLE = '__new-aisle__'

interface AisleSelectProps {
  value: string
  onValueChange: (aisle: Aisle) => void
  ariaLabel: string
  className?: string
  // Options shown before the aisles (e.g. «Velg hylle automatisk»), as SelectItems
  leading?: ReactNode
}

// Picks one of the family's aisles. The last option makes a new aisle, which is then picked.
export function AisleSelect({ value, onValueChange, ariaLabel, className, leading }: AisleSelectProps) {
  const { options } = useAisles()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const aisle = await createAisle(trimmed)
      setCreating(false)
      setName('')
      onValueChange(aisle.id)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Kunne ikke lage hyllen', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Select
        value={value}
        onValueChange={(next) => (next === NEW_AISLE ? setCreating(true) : onValueChange(next))}
      >
        <SelectTrigger className={className} aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {leading}
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectItem value={NEW_AISLE} className="border-t font-medium text-primary">
            <span className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Ny hylle …
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ny hylle</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Drikke"
              aria-label="Navn på hyllen"
              maxLength={MAX_AISLE_NAME_LENGTH}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Nye hyller kommer rett før «Annet» i handlelisten.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                Lag hylle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
