import { describe, expect, it } from 'vitest'
import { guessAisle, aisleRank } from './aisle'

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
    const ranks = order.map(aisleRank)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })
})
