export type BuiltInAisle = 'PRODUCE' | 'MEAT' | 'FISH' | 'FROZEN' | 'CHILLED' | 'COLD_CUTS' | 'BAKERY' | 'DRY' | 'OTHER'

// A built-in aisle, or the id of an aisle the family has made itself (FamilyAisle)
export type Aisle = BuiltInAisle | (string & {})

// Order the built-in aisles are walked in the store, so also the sort order of a shopping list.
export const AISLE_ORDER: BuiltInAisle[] = ['PRODUCE', 'MEAT', 'FISH', 'FROZEN', 'CHILLED', 'COLD_CUTS', 'BAKERY', 'DRY', 'OTHER']

export const AISLE_LABELS: Record<BuiltInAisle, string> = {
  PRODUCE: 'Frukt og grønt',
  MEAT: 'Kjøtt',
  FISH: 'Fisk og sjømat',
  FROZEN: 'Frysevarer',
  CHILLED: 'Meieri og kjølevarer',
  COLD_CUTS: 'Pålegg',
  BAKERY: 'Brød og bakevarer',
  DRY: 'Tørrvarer, sauser og krydder',
  OTHER: 'Annet',
}

// Whole-name overrides for names the keyword rules would get wrong (lowercase).
const EXACT: Record<string, BuiltInAisle> = {
  'pepperoni': 'MEAT',
  'kjøtt til betasuppe - svineknoke': 'MEAT',
  'aspargesbønner': 'PRODUCE',
  'rosmaris': 'PRODUCE',
  'grønnsakspose': 'FROZEN',
  'båtpoteter': 'FROZEN',
  'erter': 'FROZEN',
  'hvitløksbaguett': 'FROZEN',
  'hvitløksbaguetter': 'FROZEN',
  'mini-tubs': 'FROZEN',
  'potetsalat': 'CHILLED',
  'potetstappe': 'CHILLED',
  'kålerabistappe': 'CHILLED',
  'pizzatopping': 'CHILLED',
  'vegetarburger': 'CHILLED',
  'surkål': 'DRY',
  'sprøstekt løk': 'DRY',
  'tacolefser': 'DRY',
  'mais': 'DRY',
  'minimais': 'DRY',
  'sukkererter': 'PRODUCE',
  'vann': 'OTHER',
}

// Ordered: first aisle with a matching keyword wins. A keyword of 4+ characters matches anywhere
// in the name; a shorter one (3 or fewer) must end a word (Norwegian compounds put the head word last, so
// "ris" matches "risottoris" but not "brisling"). A leading "=" requires the whole word.
const RULES: [BuiltInAisle, string[]][] = [
  ['FROZEN', ['frossen', 'fryst', 'frosne', 'pommes frittes', 'findus', 'steam buns', 'fiskepinner']],
  ['DRY', [
    'buljong', 'kraft', 'hermetisk', 'hakkede', 'pakke', 'saus', 'krydder', 'paste', 'chutney', 'chips',
    'sirup', 'dressing', 'suppe', 'boks', 'pose', 'toro', 'glass', 'mix', 'blanding', 'tilbehør',
    'tacoskjell', 'terteskjell', 'salsa', 'pesto', 'sennep', 'ketchup', 'ketcup', 'majones', 'ketjap',
    'syltet', 'olje', 'eddik', 'sukker', 'salt', 'pepper', 'mel', 'maisenna', 'panko', 'havregryn',
    'gryn', 'grøt', 'juice', 'hvitvin', 'tomatpur', 'ris', 'pasta', 'spagetti', 'spaghetti', 'makaroni', 'lasagne', 'tagliatelle', 'nudler',
    'linser', 'kikerter', 'bønner', 'nøtt', 'nøtter', 'peanøtt', 'peanut', 'pinjekjerner', 'sesamfrø',
    'kokosmelk', 'bambusskudd', 'vannkastanje', 'garam', 'curry', 'karri', 'kanel', 'gurkemeie',
    'timian', 'oregano', 'laurbær', 'einebær', 'spisskummen', 'pepperkorn', 'chiliflakes', 'rød curry',
  ]],
  ['COLD_CUTS', ['pålegg', 'leverpostei', 'salami', 'servelat', 'kokt skinke', 'spekeskinke', 'kaviar']],
  ['BAKERY', ['brød', 'baguett', 'loff', 'lomper', 'lefse', 'lefser', 'pizzabunn', 'tortilla', '=bolle', '=boller', 'rundstykke']],
  ['FISH', [
    'fisk', 'laks', 'ørret', 'torsk', 'kveite', '=reke', '=reker', 'scampi', '=sei', 'sild', 'makrell',
    'sjømat', 'krabbe', 'blåskjell',
  ]],
  ['MEAT', [
    'kjøtt', 'deig', 'biff', 'entrecote', 'ytrefilet', 'storfe', 'kotelett', 'karbonade', 'kylling',
    'kalkun', 'andebryst', 'bacon', 'pølse', 'pølser', 'korv', 'medister', 'svin', 'lamme', '=lam',
    '=får', 'pulled', 'skinke', 'hamburger', 'burger', 'reinsdyr', 'ribbe', 'grillmat', 'flesk',
  ]],
  ['CHILLED', [
    'melk', 'fløte', 'rømme', 'smør', 'yoghurt', 'kefir', 'ost', 'parmesan', 'ricotta', '=egg', '=eggs',
    'margarin', 'fraiche', 'tzatziki', 'hummus', 'vegetar',
  ]],
  ['PRODUCE', [
    'agurk', 'avokado', 'avakado', 'ananas', 'appelsin', 'asparg', 'bønnespirer', 'kål', 'kålrot', 'brokkoli',
    'chili', 'tomat', 'dill', 'ingefær', 'hvitløk', 'fersken', 'gulrot', 'gulrøtter', 'jordskokk',
    'koriander', 'persille', 'selleri', 'sellerirot', 'squash', 'spinat', 'salat', 'ruccola', 'purre',
    'løk', 'rødbeter', 'pastinakk', 'potet', 'poteter', 'sopp', 'sjampinjong', 'sjampingjong', 'sitron',
    'lime', 'mango', 'paprika', 'sukkererter', 'grønnsaker', 'rosmarin', 'frukt', 'banan', 'eple', 'pære',
  ]],
]

function tokens(name: string): string[] {
  return name.split(/[^\p{L}\p{N}-]+/u).filter(Boolean)
}

function matches(name: string, words: string[], keyword: string): boolean {
  if (keyword.startsWith('=')) return words.includes(keyword.slice(1))
  if (keyword.length >= 4) return name.includes(keyword)
  return words.some(word => word.endsWith(keyword))
}

export function guessAisle(ingredient: string): BuiltInAisle {
  const name = ingredient.trim().toLowerCase()
  if (EXACT[name]) return EXACT[name]

  const words = tokens(name)
  for (const [aisle, keywords] of RULES) {
    if (keywords.some(keyword => matches(name, words, keyword))) return aisle
  }
  return 'OTHER'
}

export const isBuiltInAisle = (value: unknown): value is BuiltInAisle => AISLE_ORDER.includes(value as BuiltInAisle)

export const MAX_AISLE_NAME_LENGTH = 40

export function aisleNameKey(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase()
}

// One of the family's own aisles
export interface FamilyAisle {
  id: string
  name: string
}

export interface AisleOption {
  value: Aisle
  label: string
}

// Every aisle the family can pick, in store order: the family's own come after the built-in ones,
// just before «Annet»
export function aisleOptions(custom: FamilyAisle[] = []): AisleOption[] {
  const builtIn = AISLE_ORDER.map(value => ({ value, label: AISLE_LABELS[value] }))
  return [...builtIn.slice(0, -1), ...custom.map(aisle => ({ value: aisle.id, label: aisle.name })), builtIn[builtIn.length - 1]]
}

// An aisle that is not among the options (one of the family's own not loaded yet) counts as «Annet»
export function aisleRank(aisle: Aisle, options: AisleOption[] = aisleOptions()): number {
  const index = options.findIndex(option => option.value === aisle)
  return index === -1 ? options.length - 1 : index
}

// The items under each aisle that has any, in store order. An item whose aisle is not among the
// options is shown under «Annet», so nothing on a list goes missing.
export function groupByAisle<T extends { aisle: Aisle }>(items: T[], options: AisleOption[]): { option: AisleOption; items: T[] }[] {
  const known = new Set(options.map(option => option.value))
  return options
    .map(option => ({
      option,
      items: items.filter(item => item.aisle === option.value || (option.value === 'OTHER' && !known.has(item.aisle))),
    }))
    .filter(group => group.items.length > 0)
}
