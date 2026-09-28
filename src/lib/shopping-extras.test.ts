import { describe, expect, it } from 'vitest'
import { COMMON_ITEMS } from '../data/common-items'
import { AISLE_ORDER } from './aisle'
import { EXTRA_SOURCE, describeSources } from './shopping-extras'

describe('the common items catalogue', () => {
  it('has unique names, each with a real aisle', () => {
    const names = COMMON_ITEMS.map(item => item.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    for (const item of COMMON_ITEMS) expect(AISLE_ORDER).toContain(item.aisle)
  })

  it('has the everyday basics', () => {
    const names = COMMON_ITEMS.map(item => item.name)
    for (const basic of ['Melk', 'Brød', 'Egg', 'Smør']) expect(names).toContain(basic)
  })

  it('offers something in every group the shopping list is sorted by (except none needed)', () => {
    const aisles = new Set(COMMON_ITEMS.map(item => item.aisle))
    for (const aisle of ['PRODUCE', 'MEAT', 'CHILLED', 'BAKERY', 'DRY']) expect(aisles.has(aisle as never)).toBe(true)
  })
})

describe('describeSources', () => {
  it('describes recipe items, extra items and items with no source', () => {
    expect(describeSources(['Taco', 'Lasagne'])).toBe('fra: Taco, Lasagne')
    expect(describeSources([EXTRA_SOURCE])).toBe('Ekstra vare')
    expect(describeSources([])).toBe('')
    expect(describeSources([EXTRA_SOURCE, 'Taco (tor.)'])).toBe('fra: Taco (tor.)')
  })
})
