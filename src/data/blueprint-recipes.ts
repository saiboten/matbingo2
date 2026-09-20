import type { Day, DishType } from '../types'

// The blueprint library lives in the database and is edited by the super admin. These are its
// starting content: they are inserted the first time the library is read while it is empty.
// Changing this file does NOT change blueprints that already exist in the database.
export interface BlueprintSeed {
  id: string
  name: string
  type: DishType
  description: string
  // Comma-separated, like a recipe's own ingredients
  ingredients: string
  // How often the recipe is suggested by default (0-10)
  score: number
  suitableDays?: Day[]
  // [title, text] per step
  steps: [string, string][]
}

export const BLUEPRINT_SEEDS: BlueprintSeed[] = [
  {
    id: 'spagetti-bolognese',
    name: 'Spagetti bolognese',
    type: 'MEAT',
    description: 'Klassisk kjøttsaus med spagetti. En trygg favoritt for hele familien.',
    ingredients: 'Spagetti, Kjøttdeig, Løk, Hvitløk, Gulrot, Hermetiske tomater, Tomatpuré, Parmesan',
    score: 8,
    steps: [
      ['Gjør klart', 'Finhakk løk og hvitløk, og riv gulroten fint. Sett vann på kok til spagettien.'],
      ['Brun kjøttdeigen', 'Brun kjøttdeigen i en stor kjele til den er gjennomstekt og smuldrer. Krydre med salt og pepper.'],
      ['Fres grønnsakene', 'Ha i løk, hvitløk og gulrot og fres i 3–4 minutter til løken er myk.'],
      ['Lag sausen', 'Rør inn tomatpuré og la den riste litt. Tilsett hermetiske tomater og la sausen småkoke i 20–30 minutter. Smak til med salt, pepper og gjerne litt oregano.'],
      ['Kok spagetti', 'Kok spagettien etter anvisningen på pakken og sil av.'],
      ['Server', 'Server sausen over spagettien og strø over revet parmesan.'],
    ],
  },
  {
    id: 'kjottkaker-med-brun-saus',
    name: 'Kjøttkaker med brun saus',
    type: 'MEAT',
    description: 'Norsk hverdagsklassiker med poteter, gulrot og tyttebær.',
    ingredients: 'Kjøttdeig, Løk, Egg, Melk, Mel, Smør, Kjøttbuljong, Poteter, Gulrot, Tyttebærsyltetøy',
    score: 7,
    steps: [
      ['Sett på poteter', 'Skrell potetene og gulroten. Kok potetene møre i lettsaltet vann, og kok gulroten i staver til den er mør.'],
      ['Lag kjøttmassen', 'Bland kjøttdeig, revet løk, egg, litt melk, en spiseskje mel, salt og pepper. Elt massen godt til den er seig og jevn.'],
      ['Form kakene', 'Form massen til kjøttkaker med fuktige hender.'],
      ['Stek kakene', 'Stek kjøttkakene i smør på middels varme, ca. 5 minutter på hver side, til de er gyllne og gjennomstekt.'],
      ['Lag brun saus', 'Ta kakene ut. Smelt litt smør i pannen, rør inn 2 spiseskjeer mel og la det brunes. Spe med kjøttbuljong litt om gangen og la sausen koke i noen minutter. Smak til.'],
      ['Server', 'Server kjøttkakene med poteter, gulrot, saus og tyttebærsyltetøy.'],
    ],
  },
  {
    id: 'taco-med-kjottdeig',
    name: 'Taco med kjøttdeig',
    type: 'MEAT',
    description: 'Fredagsmat der alle lager sin egen taco.',
    ingredients: 'Kjøttdeig, Tacokrydder, Tacolefser, Salat, Tomat, Agurk, Mais, Rømme, Ost, Salsa',
    score: 9,
    suitableDays: ['FRIDAY', 'SATURDAY', 'SUNDAY'],
    steps: [
      ['Stek kjøttdeigen', 'Brun kjøttdeigen i en panne til den er gjennomstekt og smuldrer.'],
      ['Krydre', 'Strø over tacokrydderet og tilsett vann etter anvisningen på pakken. La det småkoke i noen minutter til sausen har tyknet.'],
      ['Skjær tilbehør', 'Skjær salat, tomat og agurk, sil av maisen og riv osten. Sett alt frem i skåler.'],
      ['Varm lefsene', 'Varm tacolefsene etter anvisningen på pakken.'],
      ['Server', 'La alle fylle sin egen taco med kjøttdeig og tilbehør, og topp med rømme og salsa.'],
    ],
  },
  {
    id: 'kylling-i-karri',
    name: 'Kylling i karri',
    type: 'MEAT',
    description: 'Mild og kremet karrigryte med ris.',
    ingredients: 'Kyllingfilet, Løk, Hvitløk, Paprika, Karri, Kokosmelk, Ris, Koriander',
    score: 7,
    steps: [
      ['Sett på ris', 'Kok risen etter anvisningen på pakken.'],
      ['Skjær opp', 'Skjær kyllingfileten i biter, løken i skiver, paprikaen i strimler, og finhakk hvitløken.'],
      ['Stek kyllingen', 'Brun kyllingen i olje i en stor panne. Ta den ut.'],
      ['Lag sausen', 'Fres løk, hvitløk og paprika i pannen. Rør inn karri og la den ristes et minutt. Hell i kokosmelken.'],
      ['La det småkoke', 'Legg kyllingen tilbake og la det småkoke i 10–15 minutter, til kyllingen er gjennomstekt og sausen har tyknet. Smak til med salt.'],
      ['Server', 'Server over ris og strø over hakket koriander.'],
    ],
  },
  {
    id: 'ovnsbakt-laks',
    name: 'Ovnsbakt laks med grønnsaker',
    type: 'FISH',
    description: 'Enkel middag der alt stekes i ovnen.',
    ingredients: 'Laks, Poteter, Brokkoli, Gulrot, Sitron, Olivenolje, Smør',
    score: 6,
    steps: [
      ['Sett ovnen på', 'Sett ovnen på 200 °C.'],
      ['Forbered grønnsakene', 'Skjær poteter og gulrot i biter, vend dem i olivenolje, salt og pepper og legg dem på en stekeplate. Stek i 20 minutter.'],
      ['Legg til brokkoli og laks', 'Del brokkolien i buketter og legg den på plata. Legg laksen ved siden av, krydre med salt og pepper og legg smør oppå.'],
      ['Stek videre', 'Stek i 12–15 minutter til laksen er gjennomstekt og lett å dele.'],
      ['Server', 'Server med sitronbåter til å presse over.'],
    ],
  },
  {
    id: 'fiskegrateng',
    name: 'Fiskegrateng',
    type: 'FISH',
    description: 'Kremet grateng med torsk, makaroni og gulrot.',
    ingredients: 'Torsk, Makaroni, Smør, Mel, Melk, Egg, Ost, Gulrot',
    score: 5,
    steps: [
      ['Gjør klart', 'Sett ovnen på 200 °C. Kok makaronien 1–2 minutter kortere enn anvist og sil av. Riv gulroten og skjær fisken i biter.'],
      ['Lag hvit saus', 'Smelt smør, rør inn mel og la det surre et minutt. Tilsett melken litt om gangen under omrøring til sausen er glatt. Smak til med salt og pepper.'],
      ['Bland', 'Rør inn halvparten av osten, la sausen avkjøles litt og rør inn eggene.'],
      ['Legg i form', 'Legg makaroni, gulrot og fisk lagvis i en smurt ildfast form og hell sausen over. Strø resten av osten på toppen.'],
      ['Stek', 'Stek midt i ovnen i ca. 30 minutter, til gratengen er gyllen og satt.'],
    ],
  },
  {
    id: 'gronnsakssuppe',
    name: 'Grønnsakssuppe',
    type: 'VEGAN',
    description: 'Lettlaget suppe som passer til alle årstider.',
    ingredients: 'Gulrot, Poteter, Purre, Stangselleri, Løk, Grønnsakskraft, Persille, Brød',
    score: 5,
    steps: [
      ['Skjær grønnsakene', 'Skrell og skjær gulrot og poteter i terninger. Skjær purre, selleri og løk i biter.'],
      ['Fres løken', 'Fres løken myk i litt olje i en stor kjele.'],
      ['Kok suppen', 'Ha i resten av grønnsakene og hell på vann med grønnsakskraft, så det dekker. Kok opp og la det småkoke i 20 minutter til alt er mørt.'],
      ['Smak til', 'Smak til med salt og pepper. Kjør gjerne halve suppen glatt med en stavmikser for en tykkere suppe.'],
      ['Server', 'Strø over hakket persille og server med brød.'],
    ],
  },
  {
    id: 'vegetarlasagne',
    name: 'Vegetarlasagne',
    type: 'VEGAN',
    description: 'Lasagne med squash, sopp og spinat.',
    ingredients: 'Lasagneplater, Squash, Sjampinjong, Løk, Hvitløk, Hermetiske tomater, Spinat, Mozzarellaost, Melk, Mel, Smør',
    score: 6,
    steps: [
      ['Sett ovnen på', 'Sett ovnen på 200 °C.'],
      ['Lag tomatsaus', 'Fres løk og hvitløk. Ha i squash og sopp i biter og stek i noen minutter. Tilsett hermetiske tomater og la det småkoke i 15 minutter. Rør inn spinaten mot slutten og smak til.'],
      ['Lag hvit saus', 'Smelt smør, rør inn mel og spe med melk litt om gangen til sausen er glatt. Smak til med salt og pepper.'],
      ['Legg lagvis', 'Legg tomatsaus, lasagneplater og hvit saus lagvis i en ildfast form. Avslutt med hvit saus og revet mozzarella.'],
      ['Stek', 'Stek i ca. 30–35 minutter, til lasagnen er gyllen og bobler.'],
      ['La den hvile', 'La lasagnen hvile i 10 minutter før du skjærer den.'],
    ],
  },
  {
    id: 'pannekaker',
    name: 'Pannekaker',
    type: 'OTHER',
    description: 'Tynne pannekaker med syltetøy og sukker.',
    ingredients: 'Mel, Egg, Melk, Smør, Salt, Syltetøy, Sukker',
    score: 4,
    suitableDays: ['SATURDAY', 'SUNDAY'],
    steps: [
      ['Lag røren', 'Visp mel og egg med litt av melken til en klumpfri røre. Tilsett resten av melken litt om gangen, og en klype salt. La røren svelle i 15–30 minutter.'],
      ['Varm pannen', 'Varm en stekepanne på middels varme og smelt litt smør.'],
      ['Stek', 'Stek tynne pannekaker, 1–2 minutter på hver side, til de er gylne. Hold ferdige pannekaker varme under et lokk eller i ovnen.'],
      ['Server', 'Server med syltetøy og sukker.'],
    ],
  },
  {
    id: 'hjemmelaget-pizza',
    name: 'Hjemmelaget pizza',
    type: 'OTHER',
    description: 'Pizza med egen deig og topping du velger selv.',
    ingredients: 'Hvetemel, Tørrgjær, Olivenolje, Pizzasaus, Mozzarellaost, Skinke, Sjampinjong, Paprika',
    score: 6,
    suitableDays: ['FRIDAY', 'SATURDAY', 'SUNDAY'],
    steps: [
      ['Lag deigen', 'Bland hvetemel, tørrgjær, en klype salt, olivenolje og lunkent vann til en deig. Elt i ca. 10 minutter til den er glatt og elastisk.'],
      ['La deigen heve', 'Dekk deigen til og la den heve i ca. 1 time, til den er dobbelt så stor.'],
      ['Sett ovnen på', 'Sett ovnen på 250 °C (eller så høyt den går) og legg inn en plate så den blir varm.'],
      ['Kjevle ut', 'Del deigen i to og kjevle eller strekk ut to pizzabunner på bakepapir.'],
      ['Legg på topping', 'Smør på pizzasaus og strø over mozzarella. Legg på skinke, sopp og paprika i skiver.'],
      ['Stek', 'Stek pizzaene i 8–12 minutter, til osten er gyllen og kanten sprø.'],
    ],
  },
]
