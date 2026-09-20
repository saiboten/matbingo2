import { json } from '@tanstack/react-start'
import { auth } from './auth'
import { prisma } from './prisma'

// The signed-in user and their family, read from the session and the database, never from the
// request body. When there's no login or no family, `error` is the response to send back.
export async function getFamilyUser(
  request: Request
): Promise<{ userId: string; familyId: string; error?: undefined } | { error: Response }> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return { error: json({ error: 'Du må være logget inn' }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { familyId: true } })
  if (!user?.familyId) {
    return { error: json({ error: 'Du må være med i en familie først' }, { status: 403 }) }
  }

  return { userId: session.user.id, familyId: user.familyId }
}
