import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '../../lib/prisma'
import { generateInviteCode } from '../../lib/utils'

export const Route = createFileRoute('/api/family')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const familyId = url.searchParams.get('familyId')

        if (!familyId) {
          return json({ error: 'Familie-ID må oppgis' }, { status: 400 })
        }

        try {
          const family = await prisma.family.findUnique({
            where: { id: familyId },
            include: {
              members: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              },
              _count: {
                select: {
                  recipes: true
                }
              }
            }
          })

          if (!family) {
            return json({ error: 'Fant ikke familien' }, { status: 404 })
          }

          return json({ family })
        } catch (error) {
          console.error('Error fetching family:', error)
          return json({ error: 'Kunne ikke hente familien' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { name, userId } = body

          const family = await prisma.family.create({
            data: {
              name,
              inviteCode: generateInviteCode()
            }
          })

          // Add creator to family
          await prisma.user.update({
            where: { id: userId },
            data: { familyId: family.id }
          })

          return json({ family })
        } catch (error) {
          console.error('Error creating family:', error)
          return json({ error: 'Kunne ikke opprette familien' }, { status: 500 })
        }
      }
    }
  }
})
