import { describe, expect, it } from 'vitest'
import { cleanDescription, recipeToBlueprintDraft, type SourceRecipe } from './recipe-to-blueprint'

const recipe: SourceRecipe = {
  name: '  Taco  ',
  description: 'Perfekt fredagsmat for hele familien, hver uke.',
  ingredients: 'Kjøttdeig, Tacolefser ,, Salat',
  type: 'MEAT',
  score: 8,
  suitableDays: ['FRIDAY'],
  steps: [
    { position: 2, title: 'Server', text: 'Server.' },
    { position: 1, title: 'Stek', text: 'Stek kjøttdeigen.' },
  ],
  image: { base64: 'AAAA', mimeType: 'image/png' },
}

describe('cleanDescription', () => {
  it('keeps a real description', () => {
    expect(cleanDescription('  Klassisk kjøttsaus med spagetti for hele familien.  ')).toBe(
      'Klassisk kjøttsaus med spagetti for hele familien.'
    )
  })

  it.each(['Nam nam', 'Todo', 'Hei', 'Synnes spesialitet.', '', '   '])('drops the short note %j', note => {
    expect(cleanDescription(note)).toBeNull()
  })

  it('drops bare links and placeholder text, however long', () => {
    expect(cleanDescription('https://www.matprat.no/oppskrifter/sunn/teriyakibiff/')).toBeNull()
    expect(cleanDescription('Todo: skriv en ordentlig beskrivelse av denne retten')).toBeNull()
    expect(cleanDescription('Google it, finner du på nettet uten problemer')).toBeNull()
  })

  it('handles missing values', () => {
    expect(cleanDescription(null)).toBeNull()
    expect(cleanDescription(undefined)).toBeNull()
  })
})

describe('recipeToBlueprintDraft', () => {
  it('turns a recipe into a draft: cleaned up, steps in order and numbered', () => {
    const result = recipeToBlueprintDraft(recipe)
    expect(result).toEqual({
      ok: true,
      draft: {
        name: 'Taco',
        description: 'Perfekt fredagsmat for hele familien, hver uke.',
        ingredients: 'Kjøttdeig, Tacolefser, Salat',
        type: 'MEAT',
        score: 8,
        suitableDays: ['FRIDAY'],
        steps: [
          { position: 1, title: 'Stek', text: 'Stek kjøttdeigen.' },
          { position: 2, title: 'Server', text: 'Server.' },
        ],
        image: { base64: 'AAAA', mimeType: 'image/png' },
      },
    })
  })

  it('leaves out recipes without ingredients, and says why', () => {
    expect(recipeToBlueprintDraft({ ...recipe, ingredients: '' })).toEqual({ ok: false, reason: 'ingen ingredienser' })
    expect(recipeToBlueprintDraft({ ...recipe, ingredients: ' , ,' }).ok).toBe(false)
  })

  it('turns "never suggest" (0) into a normal starting frequency for other families', () => {
    const result = recipeToBlueprintDraft({ ...recipe, score: 0 })
    expect(result.ok && result.draft.score).toBe(5)
  })

  it('defaults to every day when the recipe has none, and to no photo', () => {
    const result = recipeToBlueprintDraft({ ...recipe, suitableDays: [], image: undefined })
    expect(result.ok && result.draft.suitableDays).toHaveLength(7)
    expect(result.ok && result.draft.image).toBeNull()
  })

  it('drops a private note used as description', () => {
    const result = recipeToBlueprintDraft({ ...recipe, description: 'Nam nam' })
    expect(result.ok && result.draft.description).toBeNull()
  })
})
