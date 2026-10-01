import { describe, expect, it } from 'vitest'
import { guessAisle, aisleOptions, aisleRank, groupByAisle } from './aisle'

describe('guessAisle', () => {
  it.each([
    ['Agurk', 'PRODUCE'],
    ['Kjøttdeig', 'MEAT'],
    ['Fiskeburger', 'FISH'],
    ['Kjøttboller', 'MEAT'],
    ['Pommes Frittes', 'FROZEN'],
    ['Fetaost', 'CHILLED'],
    ['Hamburgerbrød', 'BAKERY'],
    ['Fiskebuljong', 'DRY'],
    ['Hermetiske tomater', 'DRY'],
    ['Tomatpuré', 'DRY'],
    ['Pepperoni', 'MEAT'],
    ['Something unknown', 'OTHER'],
  ])('%s -> %s', (name, aisle) => {
    expect(guessAisle(name)).toBe(aisle)
  })

  it('is case-insensitive', () => {
    expect(guessAisle('GULROT')).toBe('PRODUCE')
  })

  it('orders produce before meat before frozen before chilled before dry', () => {
    const order = ['PRODUCE', 'MEAT', 'FROZEN', 'CHILLED', 'DRY'] as const
    const ranks = order.map(aisle => aisleRank(aisle))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })
})

describe("the family's own aisles", () => {
  const options = aisleOptions([{ id: 'a1', name: 'Drikke' }, { id: 'a2', name: 'Dyremat' }])

  it('come after the built-in aisles, just before «Annet», oldest first', () => {
    expect(options.slice(-3).map(option => option.label)).toEqual(['Drikke', 'Dyremat', 'Annet'])
    expect(aisleRank('DRY', options)).toBeLessThan(aisleRank('a1', options))
    expect(aisleRank('a2', options)).toBeLessThan(aisleRank('OTHER', options))
  })

  it('groups items by aisle, putting an unknown aisle under «Annet»', () => {
    const groups = groupByAisle(
      [{ name: 'Brus', aisle: 'a1' }, { name: 'Melk', aisle: 'CHILLED' }, { name: 'Gammel', aisle: 'deleted' }, { name: 'Vann', aisle: 'OTHER' }],
      options
    )
    expect(groups.map(group => [group.option.label, group.items.map(item => item.name)])).toEqual([
      ['Meieri og kjølevarer', ['Melk']],
      ['Drikke', ['Brus']],
      ['Annet', ['Gammel', 'Vann']],
    ])
  })
})
