import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toast'
import { parseIngredients } from '../../lib/ingredient-text'
import { blueprintImageUrl, type Blueprint } from '../../lib/blueprints'
import { DISH_TYPE_COLORS, DISH_TYPE_LABELS } from '../../types'
import { ArrowLeft, Check, Plus } from 'lucide-react'

export const Route = createFileRoute('/recipes/library')({
  component: RecipeLibraryPage,
})

export function RecipeLibraryPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  // The shared library, the same for every family
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  // blueprint id -> id of the family's copy of it
  const [added, setAdded] = useState<Record<string, string>>({})
  // Which ones the family already has needs the account; the library itself doesn't
  const [checkError, setCheckError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login', replace: true })
    } else if (session && !session.user.familyId) {
      navigate({ to: '/settings', replace: true })
    }
  }, [isPending, session, navigate])

  const fetchLibrary = async () => {
    setLibraryError(null)
    try {
      const response = await fetch('/api/blueprint-library')
      if (response.ok) {
        const data = await response.json()
        setBlueprints(data.blueprints || [])
      } else {
        setLibraryError(`feil ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching the library:', error)
      setLibraryError('ingen kontakt med serveren')
    } finally {
      setLibraryLoading(false)
    }
  }

  const fetchAdded = async () => {
    setCheckError(null)
    try {
      const response = await fetch('/api/blueprints')
      if (response.ok) {
        const data = await response.json()
        // Merge, so a recipe added while this check was still running isn't wiped out by its answer
        setAdded(prev => ({ ...(data.added || {}), ...prev }))
      } else {
        setCheckError(`feil ${response.status}`)
      }
    } catch (error) {
      console.error('Error checking which recipes are added:', error)
      setCheckError('ingen kontakt med serveren')
    }
  }

  useEffect(() => {
    fetchLibrary()
  }, [])

  useEffect(() => {
    if (session?.user.familyId) fetchAdded()
  }, [session])

  const handleAdd = async (blueprint: Blueprint) => {
    setAddingId(blueprint.id)
    try {
      const response = await fetch('/api/blueprints/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprintId: blueprint.id })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setAdded(prev => ({ ...prev, [blueprint.id]: data.recipe.id }))
        toast(`«${blueprint.name}» er lagt til i oppskriftene dine`)
      } else {
        toast(data.error || 'Kunne ikke legge til oppskriften', 'error')
        // Someone may have added it already: show the current state
        if (response.status === 409) fetchAdded()
      }
    } catch (error) {
      console.error('Error adding recipe:', error)
      toast('Kunne ikke legge til oppskriften', 'error')
    } finally {
      setAddingId(null)
    }
  }

  if (isPending || libraryLoading) {
    return (
      <div className="max-w-3xl space-y-4" aria-busy="true" aria-label="Laster biblioteket">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til oppskrifter</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Oppskriftsbibliotek</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ferdige oppskrifter med fremgangsmåte, felles for alle familier. Når du legger en til, får du din egen
            kopi som du kan endre fritt. Biblioteket endres ikke.
          </p>
        </div>
      </div>

      {libraryError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm"
        >
          <span>Kunne ikke hente biblioteket ({libraryError}).</span>
          <Button variant="outline" size="sm" onClick={() => { setLibraryLoading(true); fetchLibrary() }}>
            Prøv igjen
          </Button>
        </div>
      )}

      {checkError && !libraryError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm"
        >
          <span>
            Kunne ikke sjekke hvilke oppskrifter du allerede har ({checkError}). Du kan fortsatt se biblioteket.
          </span>
          <Button variant="outline" size="sm" onClick={fetchAdded}>
            Prøv igjen
          </Button>
        </div>
      )}

      {!libraryError && blueprints.length === 0 && (
        <p className="text-muted-foreground">Biblioteket er tomt akkurat nå.</p>
      )}

      <div className="space-y-4">
        {blueprints.map(blueprint => {
          const recipeId = added[blueprint.id]
          const imageUrl = blueprintImageUrl(blueprint)
          return (
            <Card key={blueprint.id} className="overflow-hidden">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={blueprint.name}
                  loading="lazy"
                  decoding="async"
                  className="h-40 w-full object-cover sm:h-52"
                />
              )}
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg sm:text-xl">{blueprint.name}</CardTitle>
                  <Badge className={DISH_TYPE_COLORS[blueprint.type]}>{DISH_TYPE_LABELS[blueprint.type]}</Badge>
                </div>
                {blueprint.description && <p className="text-sm text-muted-foreground">{blueprint.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  <span className="font-medium">Ingredienser: </span>
                  {parseIngredients(blueprint.ingredients).join(', ')}
                </p>

                {blueprint.steps.length > 0 && (
                  <details className="group text-sm">
                    <summary className="cursor-pointer select-none font-medium text-primary hover:underline">
                      Se fremgangsmåten ({blueprint.steps.length} steg)
                    </summary>
                    <ol className="mt-3 space-y-2 border-l-2 pl-4">
                      {blueprint.steps.map((step, index) => (
                        <li key={step.position}>
                          <p className="font-medium">
                            {index + 1}. {step.title}
                          </p>
                          <p className="text-muted-foreground">{step.text}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                {recipeId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="h-9 px-3 text-sm">
                      <Check className="mr-1 h-4 w-4" />
                      Lagt til
                    </Badge>
                    <Button asChild variant="outline">
                      <Link to="/recipes/$recipeId" params={{ recipeId }}>
                        Åpne oppskriften
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="h-11 w-full sm:w-auto"
                    disabled={addingId !== null}
                    onClick={() => handleAdd(blueprint)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addingId === blueprint.id ? 'Legger til ...' : 'Legg til i mine oppskrifter'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
