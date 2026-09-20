// The super admin manages the shared blueprint library. Identified by verified email address.
export const DEFAULT_SUPER_ADMIN_EMAILS = ['saiboten@gmail.com']

// `allowed` defaults to the list above; the server may pass an override (SUPER_ADMIN_EMAILS).
export function isSuperAdmin(
  email: string | null | undefined,
  allowed: readonly string[] = DEFAULT_SUPER_ADMIN_EMAILS
): boolean {
  if (!email) return false
  const wanted = email.trim().toLowerCase()
  return allowed.some(candidate => candidate.trim().toLowerCase() === wanted)
}
