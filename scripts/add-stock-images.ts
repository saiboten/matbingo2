import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { prisma } from '../src/lib/prisma'
import { storeImage } from '../src/lib/image-storage'

// Adds Unsplash photos to blueprints and family recipes that have none.
//
//   npm run script:prod -- scripts/add-stock-images.ts search    finds candidates per dish (cached, resumable)
//   npm run script:prod -- scripts/add-stock-images.ts sheet     builds contact sheets to pick from
//   npm run script:prod -- scripts/add-stock-images.ts apply [--dry-run]   uploads picks.json choices
//
// Needs UNSPLASH_ACCESS_KEY (and BLOB_READ_WRITE_TOKEN for apply). Files go in STOCK_DIR.

const DIR = process.env.STOCK_DIR ?? path.resolve('.stock')
fs.mkdirSync(DIR, { recursive: true })
const KEY = process.env.UNSPLASH_ACCESS_KEY
const API = 'https://api.unsplash.com'
const MAX_SIZE = 1000
const QUALITY = 78

// Blueprint id -> what to search for
const BLUEPRINT_DISH: Record<string, string> = {
  'spagetti-bolognese': 'spaghetti bolognese',
  'kjottkaker-med-brun-saus': 'meatballs with gravy and potatoes',
  'taco-med-kjottdeig': 'tacos ground beef',
  'kylling-i-karri': 'chicken curry',
  'ovnsbakt-laks': 'baked salmon with vegetables',
  'fiskegrateng': 'fish gratin',
  'gronnsakssuppe': 'vegetable soup',
  'vegetarlasagne': 'vegetable lasagna',
  'pannekaker': 'pancakes',
  'hjemmelaget-pizza': 'homemade pizza',
  'biff-og-gronnsakswok': 'beef stir fry vegetables',
  'fajitas': 'fajitas',
  'falafel': 'falafel',
  'ferdig-fiskegrateng': 'fish gratin',
  'fiskepudding-i-terteskjell': 'creamy fish dish',
  'farikal': 'lamb and cabbage stew',
  'gulrotsuppe': 'carrot soup',
  'gyros': 'gyros pita',
  'indisk-kylling-i-kokoscurry': 'chicken coconut curry',
  'karbonader-pa-brodskiven': 'burger patty on bread',
  'kremet-pasta-med-ricotta-og-purre': 'creamy pasta leek',
  'kyllingklubber-og-ris': 'chicken drumsticks with rice',
  'kalstuing': 'cabbage stew',
  'lapskaus-pa-boks': 'beef stew vegetables',
  'nachos': 'nachos',
  'pulled-pork-asian-style': 'pulled pork',
  'spagetti-og-kjottboller': 'spaghetti and meatballs',
  'steam-buns': 'bao steamed buns',
  'tom-kha-gai-suppe': 'tom kha gai soup',
  'vegetarburger': 'veggie burger'
}

// Recipe name (trimmed, lower case) -> what to search for. Takeaway, "Wok" and "Suppe any kind" are left out on purpose.
const RECIPE_DISH: Record<string, string> = {
  'indrefilet svin': 'pork tenderloin',
  'lapskaus': 'beef stew vegetables',
  'lapskaus på boks': 'beef stew vegetables',
  'kyllingklubber og ris': 'chicken drumsticks with rice',
  'laks og grønnsaker i ovn': 'baked salmon with vegetables',
  'cheeseburger': 'cheeseburger',
  'bali kyllinggryte': 'balinese chicken curry',
  'risgrøt': 'rice porridge cinnamon',
  'pasta bolognese': 'spaghetti bolognese',
  'spagetti bolognese': 'spaghetti bolognese',
  'spaghetti bolognese': 'spaghetti bolognese',
  'bolo': 'spaghetti bolognese',
  'spagetti og kjøttdeig': 'spaghetti bolognese',
  'ferdig fiskegrateng': 'fish gratin',
  'fiskegrateng': 'fish gratin',
  'laksepasta': 'salmon pasta',
  'fiskekaker': 'fish cakes',
  'vegetarburger': 'veggie burger',
  'tikka masala med lam': 'lamb curry',
  'tikka masala': 'chicken tikka masala',
  'lasagne': 'lasagna',
  'fiskepudding i terteskjell': 'creamy fish dish',
  'nachos': 'nachos',
  'karbonade og egg': 'hamburger steak fried egg',
  'taco': 'tacos ground beef',
  'fajitas': 'fajitas',
  'spagetti og kjøttboller': 'spaghetti and meatballs',
  'pannekaker': 'pancakes',
  'sursøt saus med ris': 'sweet and sour chicken rice',
  'laks og spagetti': 'salmon spaghetti',
  'spagetti m gorgonzola': 'gorgonzola pasta',
  'vegetarlasagne': 'vegetable lasagna',
  'kjøttkaker': 'meatballs with gravy and potatoes',
  'torsk i ovn': 'baked cod',
  'pølse med potetmos': 'sausage mashed potatoes',
  'karbonader på brødskiven': 'burger patty on bread',
  'raspeballer': 'potato dumplings',
  'seibiff': 'pan fried white fish fillet',
  'al forno': 'baked pasta casserole',
  'havregrøt': 'oatmeal porridge',
  'gyros': 'gyros pita',
  'kålstuing': 'cabbage stew',
  'tom kha gai-suppe': 'tom kha gai soup',
  'hot dog': 'hot dog',
  'gulrotsuppe': 'carrot soup',
  'pulled pork asian style': 'pulled pork',
  'ciabatta med kylling': 'chicken ciabatta sandwich',
  'kyllingsandwich': 'chicken sandwich',
  'torsk': 'cod fillet',
  'tacogryte': 'taco soup',
  'kremet pasta med ricotta og purre': 'creamy pasta leek',
  'wok med kylling': 'chicken stir fry',
  'chilli sin carne': 'vegetarian chili beans',
  'vegetarwraps': 'vegetarian wraps',
  'pasta med kikerter og tomater': 'chickpea tomato pasta',
  'laks m pesto': 'pesto salmon',
  'vegetarmossaka': 'vegetarian moussaka',
  'biff og grønnsakswok': 'beef stir fry vegetables',
  'steam buns': 'bao steamed buns',
  'indisk kylling i kokoscurry': 'chicken coconut curry',
  'falafel': 'falafel',
  'fårikål': 'lamb and cabbage stew',
  'laks': 'salmon fillet'
}

interface Photo {
  id: string
  alt: string | null
  color: string | null
  author: string
  authorUrl: string
  pageUrl: string
  regular: string
  small: string
  downloadLocation: string
}
type Cache = Record<string, Photo[]>

const cachePath = path.join(DIR, 'search.json')
const picksPath = path.join(DIR, 'picks.json')
const readJson = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback)
const dishes = [...new Set([...Object.values(BLUEPRINT_DISH), ...Object.values(RECIPE_DISH)])]

async function unsplash(pathname: string) {
  if (!KEY) throw new Error('UNSPLASH_ACCESS_KEY mangler i miljøfilen')
  const response = await fetch(`${API}${pathname}`, { headers: { Authorization: `Client-ID ${KEY}`, 'Accept-Version': 'v1' } })
  const remaining = response.headers.get('x-ratelimit-remaining')
  return { response, remaining }
}

async function search() {
  const cache = readJson<Cache>(cachePath, {})
  for (const dish of dishes) {
    if (cache[dish]) continue
    const params = new URLSearchParams({ query: dish, per_page: '4', orientation: 'landscape', content_filter: 'high' })
    const { response, remaining } = await unsplash(`/search/photos?${params}`)
    if (response.status === 403 || response.status === 429) {
      console.log('Grensen er nådd. Kjør på nytt om en time; det som er hentet er lagret.')
      break
    }
    if (!response.ok) throw new Error(`${dish}: ${response.status}`)
    const data = (await response.json()) as { results: any[] }
    cache[dish] = data.results.map((r) => ({
      id: r.id,
      alt: r.alt_description,
      color: r.color,
      author: r.user.name,
      authorUrl: r.user.links.html,
      pageUrl: r.links.html,
      regular: r.urls.regular,
      small: r.urls.small,
      downloadLocation: r.links.download_location
    }))
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1))
    console.log(`${dish}: ${cache[dish].length} treff (igjen i timen: ${remaining})`)
    if (remaining !== null && Number(remaining) <= 1) {
      console.log('Grensen er nådd. Kjør på nytt om en time; det som er hentet er lagret.')
      break
    }
  }
  console.log(`${Object.keys(cache).length} av ${dishes.length} retter har treff`)
}

async function sheet() {
  const cache = readJson<Cache>(cachePath, {})
  const done = dishes.filter((dish) => cache[dish])
  const W = 300
  const H = 200
  const PER_SHEET = 8
  for (let s = 0; s * PER_SHEET < done.length; s++) {
    const group = done.slice(s * PER_SHEET, (s + 1) * PER_SHEET)
    const layers: sharp.OverlayOptions[] = []
    for (let row = 0; row < group.length; row++) {
      const photos = cache[group[row]]
      for (let col = 0; col < photos.length; col++) {
        const bytes = Buffer.from(await (await fetch(photos[col].small)).arrayBuffer())
        const tile = await sharp(bytes).resize(W, H, { fit: 'cover' }).toBuffer()
        const label = Buffer.from(
          `<svg width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="22" fill="#000" fill-opacity=".65"/><text x="6" y="16" font-size="14" fill="#fff" font-family="Arial">${row + 1 + s * PER_SHEET}.${col}  ${group[row]}</text></svg>`
        )
        layers.push({ input: await sharp(tile).composite([{ input: label }]).toBuffer(), left: col * W, top: row * H })
      }
    }
    const out = path.join(DIR, `sheet-${s + 1}.jpg`)
    await sharp({ create: { width: W * 4, height: H * group.length, channels: 3, background: '#fff' } })
      .composite(layers)
      .jpeg({ quality: 80 })
      .toFile(out)
    console.log(out)
  }
}

async function apply() {
  const dryRun = process.argv.includes('--dry-run')
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN mangler i miljøfilen')
  const cache = readJson<Cache>(cachePath, {})
  // Index of the chosen candidate per dish; `null` (or missing candidates) means no photo
  const picks = readJson<Record<string, number | null>>(picksPath, {})
  const creditsPath = path.join(DIR, 'credits.json')
  const credits = readJson<Record<string, Photo>>(creditsPath, {})

  const blueprints = await prisma.blueprint.findMany({ where: { imageUrl: null, image: null }, select: { id: true } })
  const recipes = await prisma.recipe.findMany({ where: { imageUrl: null, image: null }, select: { id: true, name: true } })

  const targets: Record<string, { blueprints: string[]; recipes: string[] }> = {}
  const add = (dish: string | undefined, kind: 'blueprints' | 'recipes', id: string) => {
    if (dish) (targets[dish] ??= { blueprints: [], recipes: [] })[kind].push(id)
  }
  for (const b of blueprints) add(BLUEPRINT_DISH[b.id], 'blueprints', b.id)
  for (const r of recipes) add(RECIPE_DISH[r.name.trim().toLowerCase()], 'recipes', r.id)

  let done = 0
  let skipped = 0
  let failed = 0
  for (const [dish, ids] of Object.entries(targets)) {
    const pick = dish in picks ? picks[dish] : 0
    const photo = pick === null ? undefined : cache[dish]?.[pick]
    if (!photo) {
      skipped += ids.blueprints.length + ids.recipes.length
      console.log(`hopper over «${dish}» (ingen valgt)`)
      continue
    }
    console.log(`«${dish}»: ${photo.pageUrl} (${ids.blueprints.length} blueprints, ${ids.recipes.length} oppskrifter)`)
    if (dryRun) continue
    try {
      const original = Buffer.from(await (await fetch(photo.regular)).arrayBuffer())
      const output = await sharp(original)
        .rotate()
        .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer()
      const image = { base64: output.toString('base64'), mimeType: 'image/webp' }
      // Unsplash asks apps to report a download when a photo is used
      await unsplash(new URL(photo.downloadLocation).pathname + new URL(photo.downloadLocation).search)

      for (const id of ids.blueprints) {
        const imageUrl = await storeImage(image, 'blueprints')
        await prisma.blueprint.update({ where: { id }, data: { imageUrl }, select: { id: true } })
        credits[`blueprint:${id}`] = photo
        done++
      }
      // Every recipe gets its own file, so replacing or deleting one photo never affects another
      for (const id of ids.recipes) {
        const imageUrl = await storeImage(image, 'recipes')
        await prisma.recipe.update({ where: { id }, data: { imageUrl }, select: { id: true } })
        credits[`recipe:${id}`] = photo
        done++
      }
      fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 1))
      console.log(`  ${(original.length / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`)
    } catch (error) {
      failed++
      console.error(`FEIL «${dish}»: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.log(`\n${dryRun ? 'Ville lagt til' : 'Lagt til'}: ${dryRun ? Object.values(targets).reduce((n, t) => n + t.blueprints.length + t.recipes.length, 0) - skipped : done}, hoppet over: ${skipped}, feilet: ${failed}`)
}

const command = process.argv[2]
if (command === 'search') await search()
else if (command === 'sheet') await sheet()
else if (command === 'apply') await apply()
else console.error('Bruk: search | sheet | apply [--dry-run]')

await prisma.$disconnect()
