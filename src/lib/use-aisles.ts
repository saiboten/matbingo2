import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { AISLE_LABELS, aisleOptions, isBuiltInAisle, type Aisle, type AisleOption, type FamilyAisle } from './aisle'

// The family's own aisles, fetched once and shared by every component on the page, so an aisle made
// in one picker shows up in all of them
let custom: FamilyAisle[] = []
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function setCustom(next: FamilyAisle[]) {
  custom = next
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function load() {
  if (!loading) {
    loading = fetch('/api/aisles')
      .then(response => (response.ok ? response.json() : { aisles: [] }))
      .then(data => setCustom(Array.isArray(data.aisles) ? data.aisles : []))
      .catch(() => {
        // Tried again the next time a component asks
        loading = null
      })
  }
}

// Makes a new aisle; resolves to it, or rejects with a message to show
export async function createAisle(name: string): Promise<FamilyAisle> {
  const response = await fetch('/api/aisles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.aisle) throw new Error(data.error || 'Kunne ikke lage hyllen')
  const aisle: FamilyAisle = data.aisle
  if (!isBuiltInAisle(aisle.id) && !custom.some(row => row.id === aisle.id)) setCustom([...custom, aisle])
  return aisle
}

export function useAisles(): { options: AisleOption[]; labelOf: (aisle: Aisle) => string } {
  const current = useSyncExternalStore(subscribe, () => custom, () => custom)
  useEffect(load, [])
  return useMemo(() => {
    const options = aisleOptions(current)
    const labels = new Map(options.map(option => [option.value, option.label]))
    return { options, labelOf: (aisle: Aisle) => labels.get(aisle) ?? AISLE_LABELS.OTHER }
  }, [current])
}
