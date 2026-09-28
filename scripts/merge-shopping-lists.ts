import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// One-off, run BEFORE `prisma db push` adds the one-list-per-family constraint: keeps each family's
// newest shopping list and deletes the older ones (their items go with them).
const lists = await prisma.shoppingList.findMany({
  select: { id: true, familyId: true },
  orderBy: { createdAt: 'desc' }
})

const kept = new Set<string>()
const older: string[] = []
for (const list of lists) {
  if (kept.has(list.familyId)) older.push(list.id)
  else kept.add(list.familyId)
}

const { count } = await prisma.shoppingList.deleteMany({ where: { id: { in: older } } })
console.log(`Kept ${kept.size} lists (one per family), deleted ${count} older ones`)
await prisma.$disconnect()
