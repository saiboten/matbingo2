import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import part1 from './recipe-steps-data/part1'
import part2 from './recipe-steps-data/part2'
import part3 from './recipe-steps-data/part3'
import part4 from './recipe-steps-data/part4'
import part5 from './recipe-steps-data/part5'
import type { StepList } from './recipe-steps-data/types'

// Usage: npx vite-node scripts/seed-recipe-steps.ts <familyId> [--dry-run]
// Adds the best-effort steps to recipes that have NO steps yet, matched by recipe name.
// Recipes that already have steps (hand-written or edited in the app) are never touched.
const familyId = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!familyId) {
  console.error('Bruk: npx vite-node scripts/seed-recipe-steps.ts <familyId> [--dry-run]')
  process.exit(1)
}

const data: Record<string, StepList> = { ...part1, ...part2, ...part3, ...part4, ...part5 }

const recipes = await prisma.recipe.findMany({
  where: { familyId },
  select: { id: true, name: true, _count: { select: { steps: true } } },
})

const byName = new Map<string, typeof recipes>()
for (const recipe of recipes) byName.set(recipe.name, [...(byName.get(recipe.name) ?? []), recipe])

let added = 0
let skippedExisting = 0
const noData: string[] = []

for (const recipe of recipes) {
  if (recipe._count.steps > 0) {
    skippedExisting++
    continue
  }
  const steps = data[recipe.name]
  if (!steps) {
    noData.push(recipe.name)
    continue
  }
  if (!dryRun) {
    await prisma.recipeStep.createMany({
      data: steps.map(([title, text], index) => ({ recipeId: recipe.id, position: index + 1, title, text })),
    })
  }
  added++
}

const unusedNames = Object.keys(data).filter(name => !byName.has(name))

console.log(`${dryRun ? '[dry run] ' : ''}Lagt til steg for ${added} oppskrifter`)
console.log(`Hoppet over (har allerede steg): ${skippedExisting}`)
if (noData.length) console.log(`Ingen data for: ${noData.join(', ')}`)
if (unusedNames.length) console.log(`Navn i dataene som ikke finnes i databasen: ${unusedNames.join(', ')}`)
await prisma.$disconnect()
