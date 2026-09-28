import { prisma } from './prisma'
import { effectiveAdminId } from './family'

// Everyone except the family owner gets the simple mode: just the shopping list
export async function isSimpleUser(userId: string, familyId: string, db: Pick<typeof prisma, 'family'> = prisma): Promise<boolean> {
  const family = await db.family.findUnique({
    where: { id: familyId },
    select: { adminId: true, members: { select: { id: true, createdAt: true } } }
  })
  if (!family) return true
  return effectiveAdminId(family.adminId, family.members) !== userId
}
