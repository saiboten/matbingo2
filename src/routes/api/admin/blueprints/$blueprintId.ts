import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../../lib/prisma'
import { parseBlueprintInput, parseImageInput } from '../../../../lib/blueprint-input'
import { requireSuperAdmin } from '../../../../lib/session'

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

          const existing = await prisma.blueprint.findUnique({ where: { id: params.blueprintId }, select: { id: true } })
          if (!existing) return json({ error: 'Fant ikke oppskriften' }, { status: 404 })

          const { steps, ...fields } = parsed.value
          await prisma.$transaction([
            prisma.blueprint.update({ where: { id: params.blueprintId }, data: fields }),
            prisma.blueprintStep.deleteMany({ where: { blueprintId: params.blueprintId } }),
            prisma.blueprintStep.createMany({
              data: steps.map((step, index) => ({
                blueprintId: params.blueprintId,
                position: index + 1,
                title: step.title || null,
                text: step.text
              }))
            }),
            ...(image.value
              ? [
                  prisma.blueprintImage.upsert({
                    where: { blueprintId: params.blueprintId },
                    update: image.value,
                    create: { blueprintId: params.blueprintId, ...image.value }
                  })
                ]
              : [])
          ])

          return json({ success: true })
        } catch (error) {
          console.error('Error updating blueprint:', error)
          return json({ error: 'Kunne ikke oppdatere oppskriften' }, { status: 500 })
        }
      },

      DELETE: async ({ request, params }) => {
        const who = await requireSuperAdmin(request)
        if (who.error) return who.error

        try {
          const result = await prisma.blueprint.deleteMany({ where: { id: params.blueprintId } })
          if (result.count === 0) return json({ error: 'Fant ikke oppskriften' }, { status: 404 })
          return json({ success: true })
        } catch (error) {
          console.error('Error deleting blueprint:', error)
          return json({ error: 'Kunne ikke slette oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
