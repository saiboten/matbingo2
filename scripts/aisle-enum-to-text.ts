import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// One-off, run BEFORE `prisma db push` turns the aisle columns from the Aisle enum into text (so a
// family's own aisles can be stored): converts them in place, keeping every value, and drops the enum.
// db push would otherwise drop and re-add the columns, losing the aisles chosen. Safe to run twice.
await prisma.$executeRawUnsafe(`ALTER TABLE "Ingredient" ALTER COLUMN "aisle" DROP DEFAULT`)
await prisma.$executeRawUnsafe(`ALTER TABLE "Ingredient" ALTER COLUMN "aisle" TYPE TEXT USING "aisle"::text`)
await prisma.$executeRawUnsafe(`ALTER TABLE "Ingredient" ALTER COLUMN "aisle" SET DEFAULT 'OTHER'`)
await prisma.$executeRawUnsafe(`ALTER TABLE "ShoppingListItem" ALTER COLUMN "aisle" DROP DEFAULT`)
await prisma.$executeRawUnsafe(`ALTER TABLE "ShoppingListItem" ALTER COLUMN "aisle" TYPE TEXT USING "aisle"::text`)
await prisma.$executeRawUnsafe(`ALTER TABLE "ShoppingListItem" ALTER COLUMN "aisle" SET DEFAULT 'OTHER'`)
await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Aisle"`)
console.log('Aisle columns are now text')
await prisma.$disconnect()
