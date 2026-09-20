import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminGate } from '../../../components/admin-gate'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Skeleton } from '../../../components/ui/skeleton'
import { useToast } from '../../../components/ui/toast'
import { useBlueprintLibrary } from '../../../lib/use-blueprint-library'
import { blueprintImageUrl, type Blueprint } from '../../../lib/blueprints'
import { DISH_TYPE_COLORS, DISH_TYPE_LABELS } from '../../../types'
import { ChefHat, Library, Pencil, Plus, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/admin/blueprints/')({
  component: () => (
    <AdminGate>
      <AdminBlueprintsPage />
    </AdminGate>
  ),
})

function AdminBlueprintsPage() {
  const toast = useToast()
  const { blueprints, loading, error, reload } = useBlueprintLibrary()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (blueprint: Blueprint) => {
    if (
      !confirm(
        `Slette «${blueprint.name}» fra biblioteket? Familier som allerede har lagt den til beholder sin egen kopi.`
      )
    )
      return

    setDeletingId(blueprint.id)
    try {
      const response = await fetch(`/api/admin/blueprints/${blueprint.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast(`«${blueprint.name}» er slettet`)
        await reload()
      } else {
        const data = await response.json().catch(() => ({}))
        toast(data.error || 'Kunne ikke slette oppskriften', 'error')
      }
    } catch (err) {
      console.error('Error deleting blueprint:', err)
      toast('Kunne ikke slette oppskriften', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Administrer biblioteket</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Superadministrator: rediger oppskriftene alle familier kan legge til. Endringer gjelder for de som legger
            dem til fra nå av. Kopier familier allerede har, endres ikke.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/recipes/library">
              <Library className="h-4 w-4 mr-2" />
              Se biblioteket
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/blueprints/new">
              <Plus className="h-4 w-4 mr-2" />
              Ny oppskrift
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
          <span>Kunne ikke hente biblioteket ({error}).</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Prøv igjen
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          {!error && blueprints.length === 0 && <p className="text-muted-foreground">Biblioteket er tomt.</p>}
          <ul className="divide-y rounded-lg border">
            {blueprints.map(blueprint => {
              const imageUrl = blueprintImageUrl(blueprint)
              return (
                <li key={blueprint.id} className="flex items-center gap-3 p-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                      <ChefHat className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{blueprint.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={`text-xs ${DISH_TYPE_COLORS[blueprint.type]}`}>{DISH_TYPE_LABELS[blueprint.type]}</Badge>
                      <span>{blueprint.steps.length} steg</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="icon">
                    <Link to="/admin/blueprints/$blueprintId" params={{ blueprintId: blueprint.id }}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Rediger {blueprint.name}</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === blueprint.id}
                    onClick={() => handleDelete(blueprint)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Slett {blueprint.name}</span>
                  </Button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
