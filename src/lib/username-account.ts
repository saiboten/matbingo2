// Accounts that log in with a username still need an email in Better Auth. They get a made-up one
// on the reserved .invalid domain, which is never shown and can never receive mail.
const DOMAIN = 'brukernavn.matbingo.invalid'

export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30
export const MIN_PASSWORD_LENGTH = 8

export function usernameEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${DOMAIN}`
}

export function isUsernameEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${DOMAIN}`)
}

// What to show for a family member: the username for a username account, else the email
export function accountLabel(user: { email: string; username?: string | null; displayUsername?: string | null }): string {
  if (isUsernameEmail(user.email)) return `@${user.displayUsername || user.username || user.email.split('@')[0]}`
  return user.email
}
