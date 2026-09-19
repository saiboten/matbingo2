import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not needed to generate the client (runs on install, before env vars may be set),
    // so fall back to empty instead of failing like env() does.
    url: process.env.DATABASE_URL ?? '',
  }})