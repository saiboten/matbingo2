import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Skeleton } from '../../components/ui/skeleton'
import { parseIngredients } from '../../lib/ingredient-text'
import { cn } from '../../lib/utils'
import type { Recipe } from '../../types'
import { ArrowLeft, Check, Pencil, RotateCcw } from 'lucide-react'

export const Route = createFileRoute('/recipes/$recipeId_/cook')({
  component: CookingPage,
})

interface Progress {
  ingredients: string[]
  steps: string[]
}

const EMPTY_PROGRESS: Progress = { ingredients: [], steps: [] }

// What has been ticked off is kept in the browser, so a reload mid-cooking doesn't lose it
function useProgress(recipeId: string) {
  const storageKey = `cooking:${recipeId}`
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      setProgress(saved ? { ...EMPTY_PROGRESS, ...JSON.parse(saved) } : EMPTY_PROGRESS)
    } catch {
      setProgress(EMPTY_PROGRESS)
    }
  }, [storageKey])

  const update = (next: Progress) => {
    setProgress(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Storage can be unavailable (private mode); ticking still works for this visit
    }
  }

  const toggle = (kind: keyof Progress, id: string) =>
    update({
      ...progress,
      [kind]: progress[kind].includes(id)
        ? progress[kind].filter(x => x !== id)
        : [...progress[kind], id],
    })

  return { progress, toggle, reset: () => update(EMPTY_PROGRESS) }
}

// Keep the screen on while cooking, where the browser supports it
function useKeepAwake() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          const sentinel = await navigator.wakeLock.request('screen')
          if (cancelled) sentinel.release().catch(() => {})
          else lock = sentinel
        }
      } catch {
        // Denied or unsupported: the screen just follows the device's normal timeout
      }
    }

    request()
    // The lock is dropped when the tab is hidden, so take it again on return
    document.addEventListener('visibilitychange', request)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
    }
  }, [])
}

function CookingPage() {
  const { recipeId } = useParams({ from: '/recipes/$recipeId_/cook' })
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const { progress, toggle, reset } = useProgress(recipeId)
  useKeepAwake()

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipe/${recipeId}`)
        const data = await response.json()
        setRecipe(data.recipe ?? null)
      } catch (error) {
        console.error('Error fetching recipe:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipe()
  }, [recipeId])

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Laster oppskrift">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="space-y-4">
        <p>Fant ikke oppskriften.</p>
        <Button asChild variant="outline">
          <Link to="/recipes">Tilbake til oppskrifter</Link>
        </Button>
      </div>
    )
  }

  const ingredients = parseIngredients(recipe.ingredients)
  const steps = recipe.steps ?? []
  const stepsDone = steps.filter(step => progress.steps.includes(step.id)).length
  const nextStepId = steps.find(step => !progress.steps.includes(step.id))?.id
  const anyProgress = progress.ingredients.length > 0 || progress.steps.length > 0

  return (
    <div className="max-w-2xl space-y-6 sm:space-y-8">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="icon" className="shrink-0">
          <Link to="/recipes/$recipeId" params={{ recipeId }}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til oppskriften</span>
          </Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">Lag maten</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{recipe.name}</h1>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Ingredienser
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {progress.ingredients.filter(item => ingredients.includes(item)).length} av {ingredients.length} klare
          </span>
        </h2>
        <ul className="divide-y rounded-lg border">
          {ingredients.map(item => {
            const checked = progress.ingredients.includes(item)
            return (
              <li key={item}>
                <label className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3 active:bg-muted/60">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle('ingredients', item)}
                    className="h-6 w-6 shrink-0 [&_svg]:h-5 [&_svg]:w-5"
                  />
                  <span className={cn('min-w-0 break-words text-base', checked && 'text-muted-foreground line-through')}>
                    {item}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Fremgangsmåte
          {steps.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {stepsDone} av {steps.length} steg
            </span>
          )}
        </h2>

        {steps.length === 0 ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-muted-foreground">
              Det er ikke lagt inn noen fremgangsmåte for denne oppskriften ennå.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/recipes/$recipeId" params={{ recipeId }} search={{ edit: true }}>
                <Pencil className="mr-1 h-4 w-4" />
                Rediger oppskrift
              </Link>
            </Button>
          </div>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, index) => {
              const done = progress.steps.includes(step.id)
              const isNext = step.id === nextStepId
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => toggle('steps', step.id)}
                    aria-pressed={done}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors active:bg-muted/60',
                      isNext && 'border-primary ring-1 ring-primary',
                      done && 'bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold',
                        done ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {done ? <Check className="h-5 w-5" /> : index + 1}
                    </span>
                    <span className={cn('min-w-0', done && 'text-muted-foreground')}>
                      {step.title && (
                        <span className={cn('block text-base font-semibold', done && 'line-through')}>
                          {step.title}
                        </span>
                      )}
                      <span className="block text-base leading-relaxed">{step.text}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {steps.length > 0 && stepsDone === steps.length && (
        <p className="rounded-lg bg-muted p-4 text-center font-medium">Ferdig! God appetitt.</p>
      )}

      {anyProgress && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Nullstill avkrysninger
        </Button>
      )}
    </div>
  )
}
