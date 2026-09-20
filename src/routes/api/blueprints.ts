import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { BLUEPRINTS, matchAddedBlueprints } from '../../lib/blueprints'
import { getFamilyUser } from '../../lib/session'

export const Route = createFileRoute('/api/blueprints')({
  server: {
    handlers: {
      // Which blueprints the signed-in user's family already has (blueprint id -> recipe id). The
      // library itself is the same for everyone and isn't fetched from here.
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error

        try {
          const recipes = await prisma.recipe.findMany({
            where: { familyId: who.familyId },
            select: { id: true, name: true }
          })

          return json({ added: matchAddedBlueprints(BLUEPRINTS, recipes) })
        } catch (error) {
          console.error('Error fetching blueprints:', error)
          return json({ error: 'Kunne ikke hente biblioteket' }, { status: 500 })
        }
      }
    }
  }
})
