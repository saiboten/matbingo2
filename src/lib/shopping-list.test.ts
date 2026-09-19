import { describe, expect, it } from 'vitest'
import { buildShoppingItems } from './shopping-list'

describe('buildShoppingItems', () => {
  it('dedupes case-insensitively and tracks sources', () => {
    const items = buildShoppingItems([
      { name: 'Tacos', ingredients: 'Tortilla, beef , Onion' },
      { name: 'Soup', ingredients: 'onion,, carrot' },
    ])
    expect(items).toEqual([
      { name: 'beef', sources: ['Tacos'] },
      { name: 'carrot', sources: ['Soup'] },
      { name: 'Onion', sources: ['Tacos', 'Soup'] },
      { name: 'Tortilla', sources: ['Tacos'] },
    ])
  })
})
