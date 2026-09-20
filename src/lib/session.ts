import { json } from '@tanstack/react-start'
import { auth } from './auth'
import { prisma } from './prisma'
import { DEFAULT_SUPER_ADMIN_EMAILS, isSuperAdmin } from './super-admin'

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

// The super admins: SUPER_ADMIN_EMAILS (comma separated) if it is set, otherwise the built-in default
function superAdminEmails(): string[] {
  const configured = process.env.SUPER_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(Boolean)
  return configured?.length ? configured : DEFAULT_SUPER_ADMIN_EMAILS
}

// Only a signed-in super admin with a verified email gets through. Checked here on the server for
// every admin call; hiding the admin link in the interface is only a convenience.
export async function requireSuperAdmin(
  request: Request
): Promise<{ userId: string; error?: undefined } | { error: Response }> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return { error: json({ error: 'Du må være logget inn' }, { status: 401 }) }
  }
  if (!session.user.emailVerified || !isSuperAdmin(session.user.email, superAdminEmails())) {
    return { error: json({ error: 'Bare superadministrator har tilgang' }, { status: 403 }) }
  }

  return { userId: session.user.id }
}
