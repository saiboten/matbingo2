import { describe, expect, it } from 'vitest'
import { COMMON_ITEMS } from '../data/common-items'
import { AISLE_ORDER } from './aisle'
import {
  EXTRA_SOURCE,
  MAX_EXTRAS,
  MAX_EXTRA_NAME_LENGTH,
  describeSources,
  mergeExtras,
  normalizeExtras,
} from './shopping-extras'

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

describe('normalizeExtras', () => {
  it('trims, collapses spaces, drops empties and repeats', () => {
    expect(
      normalizeExtras([
        { name: '  Melk ' },
        { name: 'melk' },
        { name: '' },
        { name: '   ' },
        { name: 'Grønn   såpe' },
        null,
        'x',
        { name: 5 },
      ])
    ).toEqual([{ name: 'Melk' }, { name: 'Grønn såpe' }])
  })

  it('keeps a real aisle and ignores an invented one', () => {
    expect(normalizeExtras([{ name: 'Melk', aisle: 'CHILLED' }, { name: 'Brød', aisle: 'BAKERYY' }])).toEqual([
      { name: 'Melk', aisle: 'CHILLED' },
      { name: 'Brød' },
    ])
  })

  it('handles non-arrays, long names and too many items', () => {
    expect(normalizeExtras('Melk')).toEqual([])
    expect(normalizeExtras([{ name: 'x'.repeat(500) }])[0].name).toHaveLength(MAX_EXTRA_NAME_LENGTH)
    const many = Array.from({ length: MAX_EXTRAS + 20 }, (_, i) => ({ name: `Vare ${i}` }))
    expect(normalizeExtras(many)).toHaveLength(MAX_EXTRAS)
  })
})

describe('mergeExtras', () => {
  it('adds extras marked as extra, and skips what is already on the list', () => {
    const items = [{ name: 'Løk', sources: ['Taco'] }]
    expect(mergeExtras(items, [{ name: 'løk' }, { name: 'Melk' }])).toEqual([
      { name: 'Løk', sources: ['Taco'] },
      { name: 'Melk', sources: [EXTRA_SOURCE] },
    ])
  })

  it('works with no recipe items at all', () => {
    expect(mergeExtras([], [{ name: 'Melk' }])).toEqual([{ name: 'Melk', sources: [EXTRA_SOURCE] }])
  })
})

describe('describeSources', () => {
  it('describes recipe items, extra items and items with no source', () => {
    expect(describeSources(['Taco', 'Lasagne'])).toBe('fra: Taco, Lasagne')
    expect(describeSources([EXTRA_SOURCE])).toBe('Ekstra vare')
    expect(describeSources([])).toBe('')
  })
})
