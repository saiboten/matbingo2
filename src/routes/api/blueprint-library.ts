import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { listBlueprints } from '../../lib/blueprint-store'

export const Route = createFileRoute('/api/blueprint-library')({
  server: {
    handlers: {
      // The shared library. It is the same for everyone and holds no private data, so it needs no login.
      GET: async () => {
        try {
          return json({ blueprints: await listBlueprints() })
        } catch (error) {
          console.error('Error fetching the blueprint library:', error)
          return json({ error: 'Kunne ikke hente biblioteket' }, { status: 500 })
        }
      }
    }
  }
})
