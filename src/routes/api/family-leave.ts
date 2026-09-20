import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '../../lib/auth'
import { prisma } from '../../lib/prisma'
import { effectiveAdminId, resolveLeave } from '../../lib/family'

export const Route = createFileRoute('/api/family-leave')({
  server: {
    handlers: {
      // The signed-in user leaves their family. The admin must name a new admin, who takes over in
      // the same step, so a family is never left without one.
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session?.user) {
          return json({ error: 'Du må være logget inn' }, { status: 401 })
        }

        try {
          const { familyId, newAdminId } = await request.json()

          if (!familyId) {
            return json({ error: 'Mangler påkrevde parametere' }, { status: 400 })
          }

          const family = await prisma.family.findUnique({
            where: { id: familyId },
            select: { adminId: true, members: { select: { id: true, createdAt: true } } }
          })

          if (!family) {
            return json({ error: 'Fant ikke familien' }, { status: 404 })
          }

          const decision = resolveLeave({
            userId: session.user.id,
            adminId: effectiveAdminId(family.adminId, family.members),
            memberIds: family.members.map(member => member.id),
            newAdminId
          })

          if (!decision.ok) {
            return json({ error: decision.error, code: decision.code }, { status: decision.status })
          }

          await prisma.$transaction([
            ...(decision.handOverTo
              ? [prisma.family.update({ where: { id: familyId }, data: { adminId: decision.handOverTo } })]
              : []),
            prisma.user.update({ where: { id: session.user.id }, data: { familyId: null } })
          ])

          return json({ success: true })
        } catch (error) {
          console.error('Error leaving family:', error)
          return json({ error: 'Kunne ikke forlate familien' }, { status: 500 })
        }
      }
    }
  }
})
