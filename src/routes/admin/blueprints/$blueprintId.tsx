import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminGate } from '../../../components/admin-gate'
import { BlueprintForm, type BlueprintPayload } from '../../../components/blueprint-form'
import { Button } from '../../../components/ui/button'
import { Skeleton } from '../../../components/ui/skeleton'
import { useToast } from '../../../components/ui/toast'
import { ingredientOptionsFrom, useBlueprintLibrary } from '../../../lib/use-blueprint-library'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/admin/blueprints/$blueprintId')({
  component: () => (
    <AdminGate>
      <EditBlueprintPage />
    </AdminGate>
  ),
})

function EditBlueprintPage() {
  const { blueprintId } = useParams({ from: '/admin/blueprints/$blueprintId' })
  const navigate = useNavigate()
  const toast = useToast()
  const { blueprints, loading, error, reload } = useBlueprintLibrary()
  const [saving, setSaving] = useState(false)

  const blueprint = blueprints.find(item => item.id === blueprintId)

  const handleSubmit = async (payload: BlueprintPayload) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/blueprints/${blueprintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast(`«${payload.name.trim()}» er lagret`)
        navigate({ to: '/admin/blueprints' })
      } else {
        const data = await response.json().catch(() => ({}))
        toast(data.error || 'Kunne ikke lagre oppskriften', 'error')
      }
    } catch (err) {
      console.error('Error saving blueprint:', err)
      toast('Kunne ikke lagre oppskriften', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link to="/admin/blueprints">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tilbake til administrasjon</span>
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Rediger bibliotekoppskrift</h1>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
          <span>Kunne ikke hente oppskriften ({error}).</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Prøv igjen
          </Button>
        </div>
      ) : !blueprint ? (
        <p className="text-muted-foreground">Fant ikke oppskriften. Den kan ha blitt slettet.</p>
      ) : (
        <BlueprintForm
          initial={blueprint}
          ingredientOptions={ingredientOptionsFrom(blueprints)}
          saving={saving}
          submitLabel="Lagre endringer"
          onSubmit={handleSubmit}
          onCancel={() => navigate({ to: '/admin/blueprints' })}
        />
      )}
    </div>
  )
}
