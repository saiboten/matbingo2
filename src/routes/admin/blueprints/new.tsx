import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AdminGate } from '../../../components/admin-gate'
import { BlueprintForm, type BlueprintPayload } from '../../../components/blueprint-form'
import { Button } from '../../../components/ui/button'
import { useToast } from '../../../components/ui/toast'
import { ingredientOptionsFrom, useBlueprintLibrary } from '../../../lib/use-blueprint-library'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/admin/blueprints/new')({
  component: () => (
    <AdminGate>
      <NewBlueprintPage />
    </AdminGate>
  ),
})

function NewBlueprintPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { blueprints } = useBlueprintLibrary()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (payload: BlueprintPayload) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast(`«${payload.name.trim()}» er lagt til i biblioteket`)
        navigate({ to: '/admin/blueprints' })
      } else {
        const data = await response.json().catch(() => ({}))
        toast(data.error || 'Kunne ikke opprette oppskriften', 'error')
      }
    } catch (err) {
      console.error('Error creating blueprint:', err)
      toast('Kunne ikke opprette oppskriften', 'error')
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
        <h1 className="text-2xl sm:text-3xl font-bold">Ny bibliotekoppskrift</h1>
      </div>

      <BlueprintForm
        ingredientOptions={ingredientOptionsFrom(blueprints)}
        saving={saving}
        submitLabel="Legg til i biblioteket"
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: '/admin/blueprints' })}
      />
    </div>
  )
}
