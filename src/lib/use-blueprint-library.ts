import { useCallback, useEffect, useState } from 'react'
import type { Blueprint } from './blueprints'
import { parseIngredients } from './ingredient-text'

// Loads the shared blueprint library, telling a failed request apart from an empty library
export function useBlueprintLibrary() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/blueprint-library')
      if (response.ok) {
        const data = await response.json()
        setBlueprints(data.blueprints || [])
      } else {
        setError(`feil ${response.status}`)
      }
    } catch (err) {
      console.error('Error fetching the library:', err)
      setError('ingen kontakt med serveren')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { blueprints, loading, error, reload }
}

// Every ingredient name used by the library, for suggestions while typing
export function ingredientOptionsFrom(blueprints: Blueprint[]): string[] {
  const seen = new Map<string, string>()
  for (const blueprint of blueprints) {
    for (const name of parseIngredients(blueprint.ingredients)) {
      if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'nb'))
}
