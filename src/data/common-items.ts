import type { Aisle } from '../lib/aisle'

// Everyday things a family often needs besides what the recipes call for. Offered as one-tap choices
// when a shopping list is made; each has the aisle it is found in.
export interface CommonItem {
  name: string
  aisle: Aisle
}

const item = (aisle: Aisle, ...names: string[]): CommonItem[] => names.map(name => ({ name, aisle }))

export const COMMON_ITEMS: CommonItem[] = [
  ...item('PRODUCE', 'Bananer', 'Epler', 'Appelsiner', 'Sitroner', 'Druer', 'Agurk', 'Tomater', 'Paprika', 'Salat', 'Løk', 'Hvitløk', 'Poteter', 'Gulrøtter', 'Brokkoli', 'Avokado', 'Sopp'),
  ...item('MEAT', 'Kjøttdeig', 'Kyllingfilet', 'Bacon', 'Pølser'),
  ...item('FISH', 'Laks', 'Torsk', 'Reker'),
  ...item('FROZEN', 'Frosne grønnsaker', 'Frosne bær', 'Pommes frites', 'Is'),
  ...item('CHILLED', 'Melk', 'Smør', 'Egg', 'Ost', 'Brunost', 'Smøreost', 'Yoghurt', 'Rømme', 'Fløte'),
  ...item('COLD_CUTS', 'Skinke', 'Leverpostei', 'Salami', 'Kaviar'),
  ...item('BAKERY', 'Brød', 'Rundstykker', 'Knekkebrød', 'Lefser'),
  ...item('DRY', 'Mel', 'Sukker', 'Salt', 'Pepper', 'Olje', 'Pasta', 'Ris', 'Havregryn', 'Cornflakes', 'Kaffe', 'Te', 'Hermetiske tomater', 'Tomatpuré', 'Ketchup', 'Majones', 'Syltetøy', 'Honning', 'Peanøttsmør'),
  ...item('OTHER', 'Toalettpapir', 'Tørkerull', 'Oppvaskmiddel', 'Søppelposer', 'Bakepapir', 'Aluminiumsfolie'),
]
