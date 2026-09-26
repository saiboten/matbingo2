export type Aisle = 'PRODUCE' | 'MEAT' | 'FISH' | 'FROZEN' | 'CHILLED' | 'COLD_CUTS' | 'BAKERY' | 'DRY' | 'OTHER'

// Order the aisles are walked in the store, so also the sort order of a shopping list.
export const AISLE_ORDER: Aisle[] = ['PRODUCE', 'MEAT', 'FISH', 'FROZEN', 'CHILLED', 'COLD_CUTS', 'BAKERY', 'DRY', 'OTHER']

export const AISLE_LABELS: Record<Aisle, string> = {
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
const EXACT: Record<string, Aisle> = {
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
const RULES: [Aisle, string[]][] = [
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

export function guessAisle(ingredient: string): Aisle {
  const name = ingredient.trim().toLowerCase()
  if (EXACT[name]) return EXACT[name]

  const words = tokens(name)
  for (const [aisle, keywords] of RULES) {
    if (keywords.some(keyword => matches(name, words, keyword))) return aisle
  }
  return 'OTHER'
}

export function aisleRank(aisle: Aisle): number {
  return AISLE_ORDER.indexOf(aisle)
}
