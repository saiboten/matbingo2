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

export type LeaveDecision =
  | { ok: true; handOverTo: string | null }
  | { ok: false; status: number; code: 'NOT_A_MEMBER' | 'ONLY_MEMBER' | 'HAND_OVER_REQUIRED'; error: string }

// Whether a member may leave their family. The admin can't just leave: they must hand the admin role
// to another member first, and the last member can't leave (the family would be left without anyone).
export function resolveLeave(input: {
  userId: string
  adminId: string | null
  memberIds: string[]
  newAdminId?: string | null
}): LeaveDecision {
  const { userId, adminId, memberIds, newAdminId } = input

  if (!memberIds.includes(userId)) {
    return { ok: false, status: 404, code: 'NOT_A_MEMBER', error: 'Du er ikke medlem av denne familien' }
  }

  if (userId !== adminId) return { ok: true, handOverTo: null }

  const others = memberIds.filter(id => id !== userId)
  if (others.length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'ONLY_MEMBER',
      error: 'Du er den eneste i familien. Inviter noen først, så kan du overføre administrasjonen og forlate familien.',
    }
  }

  if (!newAdminId || !others.includes(newAdminId)) {
    return {
      ok: false,
      status: 400,
      code: 'HAND_OVER_REQUIRED',
      error: 'Du er administrator. Velg hvem som skal overta før du forlater familien.',
    }
  }

  return { ok: true, handOverTo: newAdminId }
}
