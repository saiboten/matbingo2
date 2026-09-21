import 'dotenv/config'
import { migrateImages } from '../src/lib/migrate-images'
import { prisma } from '../src/lib/prisma'

// Moves photos stored as base64 in the database to Vercel Blob and saves their links.
//
//   npm run script -- scripts/migrate-images-to-blob.ts [--dry-run]         (local database)
//   npm run script:prod -- scripts/migrate-images-to-blob.ts [--dry-run]    (production, asks for confirmation)
//
// Needs BLOB_READ_WRITE_TOKEN in the environment file. Safe to run again: photos that already have a
// link are skipped, and the old base64 rows are left in place (they are dropped in a later, separate step).

const dryRun = process.argv.includes('--dry-run')

console.log(`Database: ${new URL(process.env.DATABASE_URL ?? 'http://ingen').hostname}${dryRun ? ' – prøvekjøring, ingenting lagres' : ''}`)
if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Avbrutt: BLOB_READ_WRITE_TOKEN mangler i miljøfilen.')
  process.exit(1)
}

const report = await migrateImages({ dryRun, log: line => console.log(line) })

const mb = (report.bytes / 1024 / 1024).toFixed(1)
console.log(`\nOppskrifter:  ${report.recipes.pending} med bilde som mangler lenke, ${dryRun ? 0 : report.recipes.moved} flyttet, ${report.recipes.failed.length} feilet`)
console.log(`Blueprints:   ${report.blueprints.pending} med bilde som mangler lenke, ${dryRun ? 0 : report.blueprints.moved} flyttet, ${report.blueprints.failed.length} feilet`)
console.log(`Bildedata ${dryRun ? 'som ville blitt flyttet' : 'behandlet'}: ${mb} MB`)
for (const failure of [...report.recipes.failed, ...report.blueprints.failed]) console.error(`FEIL ${failure.id}: ${failure.error}`)

await prisma.$disconnect()
process.exit(report.recipes.failed.length + report.blueprints.failed.length > 0 ? 1 : 0)
