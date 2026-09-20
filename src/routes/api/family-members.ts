import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import { effectiveAdminId } from '../../lib/family'

export const Route = createFileRoute('/api/family-members')({
  server: {
    handlers: {
      // The family admin removes a member. The person keeps their account and can join again with
      // the invite code or start their own family; their recipes and meal plans stay with the family.
      DELETE: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return json({ error: 'Du må være logget inn' }, { status: 401 })
        }

        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')
        const userId = url.searchParams.get('userId')

        if (!familyId || !userId) {
          return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
        }

        try {
          const family = await prisma.family.findUnique({
            where: { id: familyId },
            select: { adminId: true, members: { select: { id: true, createdAt: true } } }
          })

          if (!family) {
            return json({ error: 'Fant ikke familien' }, { status: 404 })
          }

          // Only the admin may remove people, checked against the signed-in user, never the request
          if (effectiveAdminId(family.adminId, family.members) !== session.user.id) {
            return json({ error: 'Bare administratoren kan fjerne medlemmer' }, { status: 403 })
          }
          if (userId === session.user.id) {
            return json({ error: 'Du kan ikke fjerne deg selv' }, { status: 400 })
          }
          if (!family.members.some(member => member.id === userId)) {
            return json({ error: 'Fant ikke medlemmet i familien' }, { status: 404 })
          }

          await prisma.user.update({ where: { id: userId }, data: { familyId: null } })

          return json({ success: true })
        } catch (error) {
          console.error('Error removing family member:', error)
          return json({ error: 'Kunne ikke fjerne medlemmet' }, { status: 500 })
        }
      }
    }
  }
})
