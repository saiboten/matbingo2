// The admin of a family is the user who created it. Families made before that was recorded have no
// adminId, so their oldest member counts as the admin.
export function effectiveAdminId(
  adminId: string | null | undefined,
  members: { id: string; createdAt: Date | string }[]
): string | null {
  if (adminId && members.some(member => member.id === adminId)) return adminId

  const oldest = [...members].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0]
  return oldest?.id ?? null
}

// Text that is copied when someone shares the family with a new person
export function buildInviteMessage(details: { familyName: string; inviteCode: string; siteUrl: string }): string {
  return [
    `Du er invitert til familien «${details.familyName}» i Matbingo, appen vi planlegger middager i.`,
    '',
    'Slik blir du med:',
    `1. Gå til ${details.siteUrl} og logg inn med Google.`,
    '2. Velg «Bli med i en familie» under innstillinger.',
    `3. Skriv inn invitasjonskoden: ${details.inviteCode}`,
  ].join('\n')
}
