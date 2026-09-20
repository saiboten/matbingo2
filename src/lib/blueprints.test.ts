import { describe, expect, it, vi } from 'vitest'
import { BLUEPRINTS, blueprintRecipeData, findBlueprint, matchAddedBlueprints } from './blueprints'
import { normalizeSteps } from './recipe-steps'
import { parseIngredients } from './ingredient-text'

vi.mock('./prisma', () => ({ prisma: {} }))
const { BlueprintError, addBlueprintToFamily } = await import('./add-blueprint')

describe('the blueprint library', () => {
  it('has ten recipes with unique ids and names', () => {
    expect(BLUEPRINTS).toHaveLength(10)
    expect(new Set(BLUEPRINTS.map(b => b.id)).size).toBe(10)
    expect(new Set(BLUEPRINTS.map(b => b.name.toLowerCase())).size).toBe(10)
  })

  it.each(BLUEPRINTS.map(b => [b.name, b] as const))('%s is complete and fits the recipe limits', (_name, blueprint) => {
    expect(['MEAT', 'FISH', 'VEGAN', 'OTHER']).toContain(blueprint.type)
    expect(blueprint.score).toBeGreaterThanOrEqual(0)
    expect(blueprint.score).toBeLessThanOrEqual(10)
    expect(blueprint.description.trim()).not.toBe('')
    expect(parseIngredients(blueprint.ingredients).length).toBeGreaterThanOrEqual(2)
    expect(blueprint.steps.length).toBeGreaterThanOrEqual(3)
    // nothing would be trimmed or dropped when the steps are saved
    expect(normalizeSteps(blueprint.steps.map(([title, text]) => ({ title, text })))).toHaveLength(blueprint.steps.length)
  })
})

describe('findBlueprint', () => {
  it('finds a blueprint by id', () => {
    expect(findBlueprint('pannekaker')?.name).toBe('Pannekaker')
    expect(findBlueprint('nope')).toBeUndefined()
  })
})

describe('matchAddedBlueprints', () => {
  it('matches by recipe name, ignoring case and spacing', () => {
    const added = matchAddedBlueprints(BLUEPRINTS, [
      { id: 'r1', name: ' pannekaker ' },
      { id: 'r2', name: 'Noe helt annet' },
    ])
    expect(added).toEqual({ pannekaker: 'r1' })
  })
})

describe('blueprintRecipeData', () => {
  it('numbers the steps and defaults to every day', () => {
    const data = blueprintRecipeData(findBlueprint('spagetti-bolognese')!)
    expect(data.suitableDays).toHaveLength(7)
    expect(data.steps.map(step => step.position)).toEqual(data.steps.map((_, i) => i + 1))
  })

  it("keeps a blueprint's own days", () => {
    expect(blueprintRecipeData(findBlueprint('pannekaker')!).suitableDays).toEqual(['SATURDAY', 'SUNDAY'])
  })
})

describe('addBlueprintToFamily', () => {
  const makeDb = (existing: { id: string; name: string }[] = []) => {
    const create = vi.fn().mockResolvedValue({ id: 'new-recipe' })
    const findMany = vi.fn().mockResolvedValue(existing)
    return { db: { recipe: { findMany, create } } as never, create, findMany }
  }

  it('copies the recipe with its steps into the family', async () => {
    const { db, create } = makeDb()

    await expect(
      addBlueprintToFamily({ blueprintId: 'fiskegrateng', familyId: 'fam', userId: 'usr' }, db)
    ).resolves.toEqual({ id: 'new-recipe' })

    const data = create.mock.calls[0][0].data
    expect(data).toMatchObject({ name: 'Fiskegrateng', familyId: 'fam', createdById: 'usr' })
    expect(data.steps.create).toHaveLength(findBlueprint('fiskegrateng')!.steps.length)
    expect(data.steps.create[0]).toMatchObject({ position: 1 })
  })

  it('does not add the same recipe twice', async () => {
    const { db, create } = makeDb([{ id: 'mine', name: 'Fiskegrateng' }])

    await expect(
      addBlueprintToFamily({ blueprintId: 'fiskegrateng', familyId: 'fam', userId: 'usr' }, db)
    ).rejects.toMatchObject({ status: 409, recipeId: 'mine' })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an unknown blueprint', async () => {
    const { db } = makeDb()
    await expect(
      addBlueprintToFamily({ blueprintId: 'nope', familyId: 'fam', userId: 'usr' }, db)
    ).rejects.toBeInstanceOf(BlueprintError)
  })
})
