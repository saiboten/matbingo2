import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// Usage: npx vite-node scripts/seed-enchilada-steps.ts [recipeId]
// Best-effort preparation steps for the "Enchiladas" recipe (Enchiladaspakke, Kjøttdeig, Ost),
// based on how enchilada kits are usually made. Re-running replaces the recipe's steps.
const STEPS = [
  {
    title: 'Gjør klart',
    text: 'Sett ovnen på 200 °C (over- og undervarme). Ta frem en ildfast form på ca. 20 × 30 cm, og riv osten hvis den ikke allerede er revet. Legg frem alt fra enchiladaspakken.',
  },
  {
    title: 'Brun kjøttdeigen',
    text: 'Varm en stor stekepanne på middels høy varme. Ha i kjøttdeigen (typisk ca. 400 g til fire personer) og brun den under omrøring til den er gjennomstekt og smuldrer fint, ca. 5–7 minutter.',
  },
  {
    title: 'Krydre fyllet',
    text: 'Rør inn krydderblandingen fra enchiladaspakken, og tilsett vann slik det står på pakken. La det småkoke i 3–5 minutter til fyllet tykner litt. Smak til og ta pannen av varmen.',
  },
  {
    title: 'Fyll lefsene',
    text: 'Legg lefsene på et skjærebrett. Fordel kjøttfyllet nedover midten av hver lefse, og strø over en liten håndfull ost.',
  },
  {
    title: 'Rull og legg i form',
    text: 'Rull hver lefse stramt sammen. Legg dem tett i den ildfaste formen med skjøten ned, så de ikke ruller opp igjen.',
  },
  {
    title: 'Saus og ost',
    text: 'Hell enchiladasausen fra pakken jevnt utover lefsene, og strø resten av osten over.',
  },
  {
    title: 'Stek i ovnen',
    text: 'Sett formen midt i ovnen og stek i ca. 15–20 minutter, til osten er gyllen og sausen bobler i kantene. Følg tiden på pakken hvis den avviker.',
  },
  {
    title: 'Server',
    text: 'La enchiladasene hvile i 5 minutter før du serverer. Server gjerne med salat, rømme og salsa.',
  },
]

const recipeId = process.argv[2]

const recipe = recipeId
  ? await prisma.recipe.findUnique({ where: { id: recipeId } })
  : await prisma.recipe.findFirst({ where: { name: { equals: 'Enchiladas', mode: 'insensitive' } } })

if (!recipe) {
  console.error('Fant ikke oppskriften. Send inn en oppskrifts-ID som argument.')
  process.exit(1)
}

await prisma.$transaction([
  prisma.recipeStep.deleteMany({ where: { recipeId: recipe.id } }),
  prisma.recipeStep.createMany({
    data: STEPS.map((step, index) => ({ recipeId: recipe.id, position: index + 1, ...step })),
  }),
])

console.log(`Lagret ${STEPS.length} steg for «${recipe.name}» (${recipe.id})`)
await prisma.$disconnect()
