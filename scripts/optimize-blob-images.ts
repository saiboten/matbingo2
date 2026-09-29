import 'dotenv/config'
import sharp from 'sharp'
import { prisma } from '../src/lib/prisma'
import { deleteImage, isBlobUrl, storeImage } from '../src/lib/image-storage'

// Shrinks the photos in Vercel Blob for mobile screens: max 1000 px on the long side, WebP.
// Each photo is uploaded as a new file, the recipe / blueprint link is updated, and the old file is deleted.
//
//   npm run script -- scripts/optimize-blob-images.ts [--dry-run]         (local database)
//   npm run script:prod -- scripts/optimize-blob-images.ts [--dry-run]    (production, asks for confirmation)
//
// Safe to run again: photos that are already small enough are skipped.

const MAX_SIZE = 1000
const QUALITY = 78
const dryRun = process.argv.includes('--dry-run')

console.log(`Database: ${new URL(process.env.DATABASE_URL ?? 'http://ingen').hostname}${dryRun ? ' – prøvekjøring, ingenting lagres' : ''}`)
if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Avbrutt: BLOB_READ_WRITE_TOKEN mangler i miljøfilen.')
  process.exit(1)
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`
let before = 0
let after = 0
let changed = 0
let skipped = 0
let failed = 0

async function optimize(kind: 'recipes' | 'blueprints', id: string, url: string, save: (newUrl: string) => Promise<unknown>) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Kunne ikke hente bildet (${response.status})`)
    const original = Buffer.from(await response.arrayBuffer())
    const { width = 0, height = 0, format } = await sharp(original).metadata()

    const output = await sharp(original)
      .rotate()
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()

    // Already small (a WebP that is not larger, or within 15 % of the result): not worth a new upload
    if (output.length >= original.length * 0.85 || (format === 'webp' && Math.max(width, height) <= MAX_SIZE)) {
      skipped++
      console.log(`  ${kind} ${id}: hopper over (${width}x${height} ${format}, ${kb(original.length)})`)
      return
    }

    before += original.length
    after += output.length
    changed++
    console.log(`  ${kind} ${id}: ${width}x${height} ${format} ${kb(original.length)} -> ${kb(output.length)}`)
    if (dryRun) return

    const newUrl = await storeImage({ base64: output.toString('base64'), mimeType: 'image/webp' }, kind)
    await save(newUrl)
    await deleteImage(url)
  } catch (error) {
    failed++
    console.error(`FEIL ${kind} ${id}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const recipes = await prisma.recipe.findMany({ where: { imageUrl: { not: null } }, select: { id: true, imageUrl: true } })
for (const { id, imageUrl } of recipes) {
  if (!isBlobUrl(imageUrl)) continue
  await optimize('recipes', id, imageUrl, (newUrl) => prisma.recipe.update({ where: { id }, data: { imageUrl: newUrl }, select: { id: true } }))
}

const blueprints = await prisma.blueprint.findMany({ where: { imageUrl: { not: null } }, select: { id: true, imageUrl: true } })
for (const { id, imageUrl } of blueprints) {
  if (!isBlobUrl(imageUrl)) continue
  await optimize('blueprints', id, imageUrl, (newUrl) => prisma.blueprint.update({ where: { id }, data: { imageUrl: newUrl }, select: { id: true } }))
}

console.log(`\n${dryRun ? 'Ville optimalisert' : 'Optimalisert'}: ${changed}, hoppet over: ${skipped}, feilet: ${failed}`)
console.log(`Størrelse: ${kb(before)} -> ${kb(after)}`)

await prisma.$disconnect()
process.exit(failed > 0 ? 1 : 0)
