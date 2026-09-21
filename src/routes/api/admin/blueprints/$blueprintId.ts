import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../../lib/prisma'
import { parseBlueprintInput, parseImageInput } from '../../../../lib/blueprint-input'
import { requireSuperAdmin } from '../../../../lib/session'
import { ImageStorageError, deleteImage, storeImage } from '../../../../lib/image-storage'

export const Route = createFileRoute('/api/admin/blueprints/$blueprintId')({
  server: {
    handlers: {
      // The super admin edits a blueprint. Families' copies are separate recipes and stay as they are.
      PUT: async ({ request, params }) => {
        const who = await requireSuperAdmin(request)
        if (who.error) return who.error

        try {
          const body = await request.json()
          const parsed = parseBlueprintInput(body)
          if (!parsed.ok) return json({ error: parsed.error }, { status: 400 })
          const image = parseImageInput(body?.image)
          if (!image.ok) return json({ error: image.error }, { status: 400 })

          const existing = await prisma.blueprint.findUnique({ where: { id: params.blueprintId }, select: { id: true, imageUrl: true } })
          if (!existing) return json({ error: 'Fant ikke oppskriften' }, { status: 404 })

          const { steps, ...fields } = parsed.value
          const imageUrl = image.value ? await storeImage(image.value, 'blueprints') : undefined
          await prisma.$transaction([
            prisma.blueprint.update({ where: { id: params.blueprintId }, data: { ...fields, ...(imageUrl && { imageUrl }) } }),
            prisma.blueprintStep.deleteMany({ where: { blueprintId: params.blueprintId } }),
            prisma.blueprintStep.createMany({
              data: steps.map((step, index) => ({
                blueprintId: params.blueprintId,
                position: index + 1,
                title: step.title || null,
                text: step.text
              }))
            })
          ])

          if (imageUrl) await deleteImage(existing.imageUrl)

          return json({ success: true })
        } catch (error) {
          console.error('Error updating blueprint:', error)
          if (error instanceof ImageStorageError) return json({ error: error.message }, { status: 500 })
          return json({ error: 'Kunne ikke oppdatere oppskriften' }, { status: 500 })
        }
      },

      DELETE: async ({ request, params }) => {
        const who = await requireSuperAdmin(request)
        if (who.error) return who.error

        try {
          const existing = await prisma.blueprint.findUnique({ where: { id: params.blueprintId }, select: { imageUrl: true } })
          const result = await prisma.blueprint.deleteMany({ where: { id: params.blueprintId } })
          if (result.count === 0) return json({ error: 'Fant ikke oppskriften' }, { status: 404 })
          await deleteImage(existing?.imageUrl)
          return json({ success: true })
        } catch (error) {
          console.error('Error deleting blueprint:', error)
          return json({ error: 'Kunne ikke slette oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
