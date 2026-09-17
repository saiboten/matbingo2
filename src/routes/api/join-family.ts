import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'

export const Route = createFileRoute('/api/join-family')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { inviteCode, userId } = body

          if (!inviteCode || !userId) {
            return json({ error: 'Invite code and user ID required' }, { status: 400 })
          }

          const family = await prisma.family.findUnique({
            where: { inviteCode: inviteCode.toUpperCase() }
          })

          if (!family) {
            return json({ error: 'Invalid invite code' }, { status: 404 })
          }

          // Add user to family
          await prisma.user.update({
            where: { id: userId },
            data: { familyId: family.id }
          })

          return json({ family })
        } catch (error) {
          console.error('Error joining family:', error)
          return json({ error: 'Failed to join family' }, { status: 500 })
        }
      }
    }
  }
})
