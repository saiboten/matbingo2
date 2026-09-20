import 'dotenv/config'
import fs from 'node:fs'
import dotenv from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { prisma as target } from '../src/lib/prisma'
import { newBlueprintId } from '../src/lib/blueprint-id'
import { recipeToBlueprintDraft } from '../src/lib/recipe-to-blueprint'
import type { Day, DishType } from '../src/types'

// Copies one family's recipes (with steps and photos) into the shared blueprint library, to give new
// families a rich starting point.
//
//   npx vite-node scripts/import-recipes-as-blueprints.ts [--email you@example.com] [--dry-run]
//
// - SOURCE: the recipes are READ from the production database (SOURCE_DATABASE_URL, or .env.prod).
// - TARGET: the blueprints are WRITTEN to the database DATABASE_URL points at (.env, or a DATABASE_URL set for
//   the command; DOTENV_CONFIG_PATH does not work for vite-node). A target that isn't on this machine needs
//   --confirm-production, and the script prints its target first.
// - Recipes without ingredients are left out, and a recipe whose name is already a blueprint is skipped,
//   so existing blueprints are never overwritten and the script is safe to run again.

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const confirmProduction = args.includes('--confirm-production')
const email = args.includes('--email') ? args[args.indexOf('--email') + 1] : 'saiboten@gmail.com'

const hostOf = (url: string | undefined) => {
  try {
    return new URL(url ?? '').hostname
  } catch {
    return ''
  }
}

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? dotenv.parse(fs.readFileSync('.env.prod'))['DATABASE_URL']
const sourceHost = hostOf(sourceUrl)
const targetHost = hostOf(process.env.DATABASE_URL)
const targetIsLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(targetHost)

console.log(`Leser oppskrifter fra: ${sourceHost} (bare lesing)`)
console.log(`Skriver blueprints til: ${targetHost}${targetIsLocal ? ' (lokal)' : ' (IKKE lokal)'}${dryRun ? ' – prøvekjøring, ingenting lagres' : ''}`)

if (!sourceHost || !targetHost) {
  console.error('Avbrutt: mangler database-URL for kilde eller mål.')
  process.exit(1)
}
if (!targetIsLocal && !dryRun && !confirmProduction) {
  console.error('Avbrutt: målet er ikke en lokal database. Kjør på nytt med --confirm-production hvis det er meningen.')
  process.exit(1)
}

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: sourceUrl }) })

const owner = await source.user.findUnique({ where: { email }, select: { familyId: true } })
if (!owner?.familyId) {
  console.error(`Avbrutt: fant ingen familie for ${email} i kilde-databasen.`)
  process.exit(1)
}

const recipes = await source.recipe.findMany({
  where: { familyId: owner.familyId },
  include: { steps: { orderBy: { position: 'asc' } }, image: true },
  orderBy: { name: 'asc' },
})

const existing = await target.blueprint.findMany({ select: { id: true, name: true, position: true } })
const takenIds = new Set(existing.map(blueprint => blueprint.id))
const takenNames = new Set(existing.map(blueprint => blueprint.name.trim().toLowerCase()))
let nextPosition = existing.reduce((max, blueprint) => Math.max(max, blueprint.position), -1) + 1

const left: string[] = []
const skipped: string[] = []
let created = 0
let withPhoto = 0
let steps = 0
let descriptionsDropped = 0

for (const recipe of recipes) {
  const decision = recipeToBlueprintDraft({
    name: recipe.name,
    description: recipe.description,
    ingredients: recipe.ingredients,
    type: recipe.type as DishType,
    score: recipe.score,
    suitableDays: recipe.suitableDays as Day[],
    steps: recipe.steps.map(step => ({ position: step.position, title: step.title, text: step.text })),
    image: recipe.image ? { base64: recipe.image.base64, mimeType: recipe.image.mimeType } : null,
  })

  if (!decision.ok) {
    left.push(`${recipe.name} (${decision.reason})`)
    continue
  }
  const { draft } = decision

  if (takenNames.has(draft.name.toLowerCase())) {
    skipped.push(draft.name)
    continue
  }
  takenNames.add(draft.name.toLowerCase())

  if (recipe.description?.trim() && !draft.description) descriptionsDropped++
  created++
  steps += draft.steps.length
  if (draft.image) withPhoto++

  if (dryRun) continue

  const id = newBlueprintId(draft.name, takenIds)
  takenIds.add(id)
  await target.blueprint.create({
    data: {
      id,
      name: draft.name,
      description: draft.description,
      ingredients: draft.ingredients,
      type: draft.type,
      score: draft.score,
      suitableDays: draft.suitableDays,
      position: nextPosition++,
      steps: { create: draft.steps.map(step => ({ position: step.position, title: step.title, text: step.text })) },
      ...(draft.image && { image: { create: draft.image } }),
    },
    select: { id: true },
  })
}

console.log(`\nOppskrifter i familien: ${recipes.length}`)
console.log(`${dryRun ? 'Ville blitt lagt' : 'Lagt'} til som blueprints: ${created} (${steps} steg, ${withPhoto} med bilde)`)
console.log(`Beskrivelser fjernet (private notater/lenker): ${descriptionsDropped}`)
console.log(`Utelatt: ${left.length}${left.length ? ' – ' + left.join(', ') : ''}`)
console.log(`Hoppet over, finnes allerede i biblioteket: ${skipped.length}${skipped.length ? ' – ' + skipped.join(', ') : ''}`)
console.log(`Blueprints i mål-databasen nå: ${await target.blueprint.count()}`)

await source.$disconnect()
await target.$disconnect()
