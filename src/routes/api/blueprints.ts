import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { matchAddedBlueprints } from '../../lib/blueprints'
import { getFamilyUser } from '../../lib/session'

export const Route = createFileRoute('/api/blueprints')({
  server: {
    handlers: {
      // Which blueprints the signed-in user's family already has (blueprint id -> recipe id). The
      // library itself comes from /api/blueprint-library.
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error

        try {
          const [blueprints, recipes] = await Promise.all([
            prisma.blueprint.findMany({ select: { id: true, name: true } }),
            prisma.recipe.findMany({ where: { familyId: who.familyId }, select: { id: true, name: true } })
          ])

          return json({ added: matchAddedBlueprints(blueprints, recipes) })
        } catch (error) {
          console.error('Error fetching blueprints:', error)
          return json({ error: 'Kunne ikke hente biblioteket' }, { status: 500 })
        }
      }
    }
  }
})
