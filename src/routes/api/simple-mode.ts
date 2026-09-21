import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { isSimpleUser } from '../../lib/simple-mode'
import { getFamilyUser } from '../../lib/session'

export const Route = createFileRoute('/api/simple-mode')({
  server: {
    handlers: {
      // Whether the signed-in user gets the simple mode (everyone but the family owner)
      GET: async ({ request }) => {
        const who = await getFamilyUser(request)
        if (who.error) return who.error
        try {
          return json({ simple: await isSimpleUser(who.userId, who.familyId) })
        } catch (error) {
          console.error('Error reading simple mode:', error)
          return json({ error: 'Kunne ikke hente visningen' }, { status: 500 })
        }
      }
    }
  }
})
