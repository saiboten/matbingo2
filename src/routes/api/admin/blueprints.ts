import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../../lib/prisma'
import { parseBlueprintInput, parseImageInput } from '../../../lib/blueprint-input'
import { newBlueprintId } from '../../../lib/blueprint-id'
import { requireSuperAdmin } from '../../../lib/session'

export const Route = createFileRoute('/api/admin/blueprints')({
  server: {
    handlers: {
      // The super admin adds a blueprint to the shared library
      POST: async ({ request }) => {
        const who = await requireSuperAdmin(request)
        if (who.error) return who.error

        try {
          const body = await request.json()
          const parsed = parseBlueprintInput(body)
          if (!parsed.ok) return json({ error: parsed.error }, { status: 400 })
          const image = parseImageInput(body?.image)
          if (!image.ok) return json({ error: image.error }, { status: 400 })

          const { steps, ...fields } = parsed.value
          const [taken, last] = await Promise.all([
            prisma.blueprint.findMany({ select: { id: true } }),
            prisma.blueprint.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
          ])

          const created = await prisma.blueprint.create({
            data: {
              ...fields,
              id: newBlueprintId(fields.name, new Set(taken.map(row => row.id))),
              position: (last?.position ?? -1) + 1,
              steps: { create: steps.map((step, index) => ({ position: index + 1, title: step.title || null, text: step.text })) },
              ...(image.value && { image: { create: image.value } })
            },
            select: { id: true }
          })

          return json({ blueprint: created })
        } catch (error) {
          console.error('Error creating blueprint:', error)
          return json({ error: 'Kunne ikke opprette oppskriften' }, { status: 500 })
        }
      }
    }
  }
})
