import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "../generated/prisma/client";

// Pin the server process to UTC. Prisma's `@db.Date` fields round-trip
// through the process's local timezone when converting to/from JS Date
// objects; without this, a MealPlan/EatenLog date can land on the wrong
// calendar day depending on what timezone the server happens to run in.
process.env.TZ = "UTC"

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }