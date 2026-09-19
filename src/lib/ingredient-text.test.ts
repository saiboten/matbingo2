import { describe, expect, it } from 'vitest'
import { addIngredient, findExisting, formatIngredients, normalizeIngredient, parseIngredients } from './ingredient-text'

describe('parse/format', () => {
  it('round-trips the stored comma-separated form', () => {
    expect(parseIngredients('Laks, Brokkoli ,, Ris')).toEqual(['Laks', 'Brokkoli', 'Ris'])
    expect(formatIngredients(['Laks', 'Brokkoli'])).toBe('Laks, Brokkoli')
    expect(parseIngredients('')).toEqual([])
  })
})

describe('normalizeIngredient', () => {
  it('trims, collapses spaces and removes commas', () => {
    expect(normalizeIngredient('  Hvit   løk, ')).toBe('Hvit løk')
  })
})

describe('findExisting', () => {
  it('matches ignoring case and returns the existing spelling', () => {
    expect(findExisting('agurk', ['Agurk', 'Ost'])).toBe('Agurk')
    expect(findExisting('agur', ['Agurk'])).toBeUndefined()
  })
})

describe('addIngredient', () => {
  const options = ['Agurk', 'Ost']

  it('uses the existing spelling when the name matches', () => {
    expect(addIngredient([], 'agurk', options)).toEqual(['Agurk'])
  })

  it('adds an unknown name as a new ingredient', () => {
    expect(addIngredient(['Agurk'], 'Reddik', options)).toEqual(['Agurk', 'Reddik'])
  })

  it('ignores empty input and duplicates (case-insensitive)', () => {
    expect(addIngredient(['Agurk'], '   ', options)).toEqual(['Agurk'])
    expect(addIngredient(['Agurk'], 'AGURK', options)).toEqual(['Agurk'])
  })
})
