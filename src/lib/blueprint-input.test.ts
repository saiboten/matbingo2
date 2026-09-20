import { describe, expect, it } from 'vitest'
import { parseBlueprintInput, parseImageInput } from './blueprint-input'
import { newBlueprintId } from './blueprint-id'

const valid = {
  name: '  Pannekaker ',
  description: ' Tynne ',
  ingredients: 'Mel, Egg ,, Melk',
  type: 'OTHER',
  score: 4,
  suitableDays: ['SUNDAY', 'SATURDAY'],
  steps: [{ title: ' Lag røren ', text: ' Visp. ' }, { title: '', text: '   ' }],
}

describe('parseBlueprintInput', () => {
  it('cleans up a valid recipe like a normal recipe would be', () => {
    const result = parseBlueprintInput(valid)
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Pannekaker',
        description: 'Tynne',
        ingredients: 'Mel, Egg, Melk',
        type: 'OTHER',
        score: 4,
        suitableDays: ['SATURDAY', 'SUNDAY'],
        steps: [{ title: 'Lag røren', text: 'Visp.' }],
      },
    })
  })

  it.each([
    ['no name', { name: '   ' }],
    ['no ingredients', { ingredients: ' , ' }],
    ['an unknown type', { type: 'DESSERT' }],
    ['a frequency above 10', { score: 11 }],
    ['a fractional frequency', { score: 2.5 }],
    ['no days', { suitableDays: [] }],
    ['an unknown day', { suitableDays: ['MONDAY', 'FUNDAY'] }],
  ])('rejects %s', (_label, change) => {
    expect(parseBlueprintInput({ ...valid, ...change }).ok).toBe(false)
  })

  it('rejects something that is not an object', () => {
    expect(parseBlueprintInput(null).ok).toBe(false)
    expect(parseBlueprintInput('x').ok).toBe(false)
  })

  it('allows an empty description', () => {
    const result = parseBlueprintInput({ ...valid, description: '' })
    expect(result.ok && result.value.description).toBeNull()
  })
})

describe('parseImageInput', () => {
  it('accepts no image, and a real image type', () => {
    expect(parseImageInput(undefined)).toEqual({ ok: true, value: null })
    expect(parseImageInput({ base64: 'AAAA', mimeType: 'IMAGE/PNG' })).toEqual({
      ok: true,
      value: { base64: 'AAAA', mimeType: 'image/png' },
    })
  })

  it('rejects scripted content types, empty data and oversized photos', () => {
    expect(parseImageInput({ base64: 'AAAA', mimeType: 'text/html' }).ok).toBe(false)
    expect(parseImageInput({ base64: 'AAAA', mimeType: 'image/svg+xml' }).ok).toBe(false)
    expect(parseImageInput({ base64: '', mimeType: 'image/png' }).ok).toBe(false)
    expect(parseImageInput({ base64: 'A'.repeat(4_000_000), mimeType: 'image/png' }).ok).toBe(false)
  })
})

describe('newBlueprintId', () => {
  it('makes a URL-friendly id, handling Norwegian letters', () => {
    expect(newBlueprintId('Kjøttkaker i brun saus', new Set())).toBe('kjottkaker-i-brun-saus')
    expect(newBlueprintId('Blåbærsuppe å la Æ', new Set())).toBe('blabaersuppe-a-la-ae')
  })

  it('makes it unique', () => {
    expect(newBlueprintId('Pannekaker', new Set(['pannekaker']))).toBe('pannekaker-2')
    expect(newBlueprintId('Pannekaker', new Set(['pannekaker', 'pannekaker-2']))).toBe('pannekaker-3')
  })

  it('has a fallback for names without letters', () => {
    expect(newBlueprintId('???', new Set())).toBe('oppskrift')
  })
})
