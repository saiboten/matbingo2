import { describe, expect, it } from 'vitest'
import { MAX_STEPS, normalizeSteps } from './recipe-steps'

describe('normalizeSteps', () => {
  it('trims, drops steps without text and ignores junk', () => {
    expect(
      normalizeSteps([
        { title: '  Stek  ', text: '  Stek kjøttet.  ' },
        { title: 'Tom', text: '   ' },
        { text: 'Uten tittel' },
        null,
        'nope',
        { title: 5, text: 7 },
      ])
    ).toEqual([
      { title: 'Stek', text: 'Stek kjøttet.' },
      { title: '', text: 'Uten tittel' },
    ])
  })

  it('returns nothing for non-arrays and caps the number of steps', () => {
    expect(normalizeSteps('x')).toEqual([])
    const many = Array.from({ length: MAX_STEPS + 5 }, (_, i) => ({ title: '', text: `Steg ${i}` }))
    expect(normalizeSteps(many)).toHaveLength(MAX_STEPS)
  })
})
