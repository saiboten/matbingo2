import 'dotenv/config'
import zlib from 'node:zlib'
import { prisma } from '../src/lib/prisma'
import type { Day, DishType } from '../src/types'

// Fills the LOCAL development database with a test family, test recipes (some with photos and
// steps), a planned week and some eating history.
//
//   npx vite-node scripts/seed-dev.ts                       create or refresh the test data
//   npx vite-node scripts/seed-dev.ts --reset               delete the test family first, then create it again
//   npx vite-node scripts/seed-dev.ts --attach you@gmail.com   also put an existing local user in the family
//                                                           as its admin (log in once locally first)
//
// It refuses to run against any database that isn't on this machine.

const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').hostname
  } catch {
    return ''
  }
})()

if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  console.error(
    `Avbrutt: DATABASE_URL peker på «${host || 'ukjent'}», ikke en lokal database.\n` +
      'Testdata skal aldri inn i produksjon. Sjekk .env (den skal peke på localhost).'
  )
  process.exit(1)
}

const args = process.argv.slice(2)
const reset = args.includes('--reset')
const attachEmail = args.includes('--attach') ? args[args.indexOf('--attach') + 1] : undefined

const DEV_USER = { id: 'dev-user', email: 'testbruker@example.com', name: 'Testbruker' }
const DEV_FAMILY = { id: 'dev-family', name: 'Testfamilien', inviteCode: 'TESTFAM1' }

const ALL_DAYS: Day[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

interface SeedRecipe {
  name: string
  type: DishType
  score: number
  ingredients: string
  days?: Day[]
  description?: string
  hibernating?: boolean
  photo?: [number, number, number]
  steps?: [string, string][]
}

const RECIPES: SeedRecipe[] = [
  {
    name: 'Spagetti med kjøttsaus',
    type: 'MEAT',
    score: 8,
    ingredients: 'Spagetti, Kjøttdeig, Løk, Hvitløk, Hermetiske tomater, Tomatpuré, Parmesan',
    photo: [200, 80, 60],
    steps: [
      ['Kok spagetti', 'Kok spagettien etter anvisningen på pakken og sil av.'],
      ['Brun kjøttdeigen', 'Fres finhakket løk og hvitløk, og brun kjøttdeigen til den smuldrer.'],
      ['Lag sausen', 'Rør inn tomatpuré og hermetiske tomater og la det småkoke i 20 minutter.'],
      ['Server', 'Server sausen over spagettien med revet parmesan.'],
    ],
  },
  {
    name: 'Kyllingwok',
    type: 'MEAT',
    score: 7,
    ingredients: 'Kyllingfilet, Nudler, Paprika, Gulrot, Brokkoli, Soyasaus, Ingefær',
    photo: [230, 160, 40],
    steps: [
      ['Kok nudler', 'Kok nudlene og sil av.'],
      ['Skjær opp', 'Skjær kylling i strimler og grønnsakene i tynne biter.'],
      ['Wok', 'Stek kyllingen i woken, tilsett grønnsakene og soyasaus, og vend inn nudlene.'],
    ],
  },
  {
    name: 'Laks med ovnsbakte grønnsaker',
    type: 'FISH',
    score: 6,
    ingredients: 'Laks, Poteter, Gulrot, Brokkoli, Sitron, Smør',
    photo: [240, 130, 110],
    steps: [
      ['Sett ovnen på', 'Sett ovnen på 200 °C og skjær potet og gulrot i biter.'],
      ['Stek grønnsakene', 'Stek potet og gulrot i 20 minutter og legg til brokkoli.'],
      ['Stek laksen', 'Legg laksen på plata og stek i 12–15 minutter. Server med sitron og smør.'],
    ],
  },
  {
    name: 'Tacofredag',
    type: 'MEAT',
    score: 9,
    ingredients: 'Kjøttdeig, Tacokrydder, Tacolefser, Salat, Tomat, Mais, Rømme, Ost',
    days: ['FRIDAY', 'SATURDAY'],
    photo: [110, 170, 80],
    steps: [
      ['Stek kjøttdeigen', 'Brun kjøttdeigen og bland inn tacokrydder og litt vann.'],
      ['Skjær tilbehør', 'Skjær salat og tomat, og riv osten.'],
      ['Server', 'Varm lefsene og la alle fylle sin egen taco.'],
    ],
  },
  {
    name: 'Grønnsakssuppe',
    type: 'VEGAN',
    score: 5,
    ingredients: 'Gulrot, Purre, Poteter, Stangselleri, Grønnsakskraft, Persille',
    photo: [90, 160, 100],
  },
  {
    name: 'Pannekaker',
    type: 'OTHER',
    score: 4,
    ingredients: 'Mel, Egg, Melk, Smør, Syltetøy',
    days: ['SATURDAY', 'SUNDAY'],
    description: 'Klassiske pannekaker med syltetøy.',
  },
  {
    name: 'Fiskekaker med potetstappe',
    type: 'FISH',
    score: 5,
    ingredients: 'Fiskekaker, Potetstappe, Gulrot, Pastinakk',
  },
  {
    name: 'Frossenpizza',
    type: 'MEAT',
    score: 3,
    ingredients: 'Frossenpizza',
    days: ['FRIDAY', 'SATURDAY'],
    description: 'Ingen steg lagt inn her, for å teste tomtilstanden på matlagingssiden.',
  },
  {
    name: 'Lasagne',
    type: 'MEAT',
    score: 6,
    ingredients: 'Lasagneplater, Kjøttdeig, Melk, Mel, Smør, Mozzarellaost, Hermetiske tomater',
    days: ['SATURDAY', 'SUNDAY'],
    photo: [220, 120, 70],
    steps: [
      ['Lag kjøttsaus', 'Brun kjøttdeigen og la den koke med hermetiske tomater i 15 minutter.'],
      ['Lag hvit saus', 'Smelt smør, rør inn mel og spe med melk til en glatt saus.'],
      ['Legg lagvis', 'Legg saus, plater og ost lagvis i en form.'],
      ['Stek', 'Stek på 200 °C i ca. 35 minutter.'],
    ],
  },
  {
    name: 'Vegetarburger',
    type: 'VEGAN',
    score: 5,
    ingredients: 'Vegetarburger, Hamburgerbrød, Tomat, Salat, Hvitløksdressing',
  },
  {
    name: 'Pølse i brød',
    type: 'MEAT',
    score: 2,
    ingredients: 'Pølser, Pølsebrød, Ketchup, Ketcup, Sennep, Sprøstekt Løk',
    description: 'Ketchup er skrevet på to måter med vilje, for å teste at like ingredienser slås sammen.',
  },
  {
    name: 'Risotto med sopp',
    type: 'VEGAN',
    score: 6,
    ingredients: 'Risottoris, Sjampinjong, Løk, Parmesan, Smør',
    photo: [200, 180, 140],
    steps: [
      ['Fres løken', 'Fres finhakket løk i smør.'],
      ['Rist risen', 'Rist risottoriset og tilsett varm kraft litt om gangen.'],
      ['Ha i soppen', 'Stek soppen for seg og bland inn sammen med parmesan.'],
    ],
  },
  {
    name: 'Fårikål',
    type: 'MEAT',
    score: 0,
    ingredients: 'Kål, Får, Hele pepperkorn',
    days: ['SUNDAY'],
    description: 'Hyppighet 0: skal aldri foreslås automatisk.',
  },
  {
    name: 'Torsk med bacon og erter',
    type: 'FISH',
    score: 6,
    ingredients: 'Torsk, Bacon, Erter, Poteter',
    hibernating: true,
    description: 'I dvale: skal ikke dukke opp i «Foreslå middag».',
  },
  {
    name: 'Kylling i pita',
    type: 'MEAT',
    score: 7,
    ingredients: 'Kyllingfilet, Pitabrød, Agurk, Tzatziki, Rødløk',
    photo: [100, 140, 200],
  },
  {
    name: 'Thaisuppe',
    type: 'MEAT',
    score: 6,
    ingredients: 'Kokosmelk, Rød curry, Kyllingfilet, Ris, Lime, Koriander, Fiskesaus',
    photo: [230, 190, 60],
    steps: [
      ['Lag suppebasen', 'Stek den røde curryen kort og tilsett kokosmelk og vann.'],
      ['Ha i kyllingen', 'Skjær kyllingen i biter og la den koke gjennom i suppen.'],
      ['Server', 'Server med ris, limesaft og koriander.'],
    ],
  },
]

// A small placeholder photo (vertical gradient) as a PNG, so photos can be tested without real files
function gradientPng([r, g, b]: [number, number, number], width = 160, height = 96): Buffer {
  const rows: Buffer[] = []
  for (let y = 0; y < height; y++) {
    const fade = 1 - (y / height) * 0.45
    const row = Buffer.alloc(1 + width * 3)
    for (let x = 0; x < width; x++) {
      row[1 + x * 3] = Math.round(r * fade)
      row[2 + x * 3] = Math.round(g * fade)
      row[3 + x * 3] = Math.round(b * fade)
    }
    rows.push(row)
  }

  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8) // bit depth
  header.writeUInt8(2, 9) // RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Monday of the current week as a UTC calendar day, the same convention as the app
function thisMonday(): Date {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const diffToMonday = today.getUTCDay() === 0 ? -6 : 1 - today.getUTCDay()
  today.setUTCDate(today.getUTCDate() + diffToMonday)
  return today
}

function daysFromMonday(monday: Date, offset: number): Date {
  const date = new Date(monday)
  date.setUTCDate(monday.getUTCDate() + offset)
  return date
}

if (reset) {
  await prisma.family.deleteMany({ where: { id: DEV_FAMILY.id } })
  console.log('Slettet testfamilien (og alt som hører til den).')
}

await prisma.user.upsert({
  where: { id: DEV_USER.id },
  update: { name: DEV_USER.name },
  create: { ...DEV_USER, emailVerified: true },
})
await prisma.family.upsert({
  where: { id: DEV_FAMILY.id },
  update: { name: DEV_FAMILY.name },
  create: { ...DEV_FAMILY, adminId: DEV_USER.id },
})
await prisma.user.update({ where: { id: DEV_USER.id }, data: { familyId: DEV_FAMILY.id } })

const recipeIds: string[] = []
for (const [index, recipe] of RECIPES.entries()) {
  const id = `dev-recipe-${String(index + 1).padStart(2, '0')}`
  recipeIds.push(id)

  const data = {
    name: recipe.name,
    type: recipe.type,
    score: recipe.score,
    ingredients: recipe.ingredients,
    description: recipe.description ?? null,
    suitableDays: recipe.days ?? ALL_DAYS,
    hibernating: recipe.hibernating ?? false,
  }
  await prisma.recipe.upsert({
    where: { id },
    update: data,
    create: { id, ...data, familyId: DEV_FAMILY.id, createdById: DEV_USER.id },
  })

  await prisma.recipeStep.deleteMany({ where: { recipeId: id } })
  if (recipe.steps?.length) {
    await prisma.recipeStep.createMany({
      data: recipe.steps.map(([title, text], position) => ({ recipeId: id, position: position + 1, title, text })),
    })
  }

  if (recipe.photo) {
    const image = { base64: gradientPng(recipe.photo).toString('base64'), mimeType: 'image/png' }
    await prisma.recipeImage.upsert({ where: { recipeId: id }, update: image, create: { recipeId: id, ...image } })
  }
}

// A planned week, with the matching eating history the app would have recorded, plus older history
const monday = thisMonday()
await prisma.eatenLog.deleteMany({ where: { familyId: DEV_FAMILY.id } })

const planned: { offset: number; recipeIndex: number }[] = [
  { offset: 0, recipeIndex: 0 }, // Monday: Spagetti med kjøttsaus
  { offset: 1, recipeIndex: 1 }, // Tuesday: Kyllingwok
  { offset: 2, recipeIndex: 2 }, // Wednesday: Laks
]
for (const { offset, recipeIndex } of planned) {
  const date = daysFromMonday(monday, offset)
  const recipeId = recipeIds[recipeIndex]
  await prisma.mealPlan.upsert({
    where: { familyId_date: { familyId: DEV_FAMILY.id, date } },
    update: { option: 'MANUAL', recipeId, otherText: null, plannedById: DEV_USER.id },
    create: { date, option: 'MANUAL', recipeId, familyId: DEV_FAMILY.id, plannedById: DEV_USER.id },
  })
  await prisma.eatenLog.create({ data: { recipeId, familyId: DEV_FAMILY.id, date } })
}
const custom = daysFromMonday(monday, 3) // Thursday: a free-text meal
await prisma.mealPlan.upsert({
  where: { familyId_date: { familyId: DEV_FAMILY.id, date: custom } },
  update: { option: 'OTHER', recipeId: null, otherText: 'Restemiddag', plannedById: DEV_USER.id },
  create: { date: custom, option: 'OTHER', otherText: 'Restemiddag', familyId: DEV_FAMILY.id, plannedById: DEV_USER.id },
})

for (const [recipeIndex, daysAgo] of [[3, 9], [4, 12], [7, 16], [8, 19], [0, 23], [1, 27], [15, 30], [13, 35]] as const) {
  const date = daysFromMonday(monday, -daysAgo)
  await prisma.eatenLog.create({ data: { recipeId: recipeIds[recipeIndex], familyId: DEV_FAMILY.id, date } })
}

if (attachEmail) {
  const user = await prisma.user.findUnique({ where: { email: attachEmail } })
  if (!user) {
    console.error(`Fant ingen lokal bruker med e-posten ${attachEmail}. Logg inn lokalt med Google først, og kjør igjen.`)
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { familyId: DEV_FAMILY.id } })
    await prisma.family.update({ where: { id: DEV_FAMILY.id }, data: { adminId: user.id } })
    console.log(`${user.name} (${user.email}) er nå administrator i ${DEV_FAMILY.name}.`)
  }
}

console.log(
  `Ferdig. ${RECIPES.length} oppskrifter i «${DEV_FAMILY.name}» (familie-ID ${DEV_FAMILY.id}, invitasjonskode ${DEV_FAMILY.inviteCode}).`
)
await prisma.$disconnect()
