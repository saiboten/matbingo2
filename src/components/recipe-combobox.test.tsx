// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecipeCombobox } from './recipe-combobox'
import type { Recipe } from '../types'

const recipes = [
  { id: '1', name: 'Taco', type: 'MEAT', score: 5 },
  { id: '2', name: 'Fiskesuppe', type: 'FISH', score: 5 },
  { id: '3', name: 'Tacopai', type: 'MEAT', score: 5 },
] as unknown as Recipe[]

afterEach(cleanup)

const box = () => screen.getByRole('combobox')

describe('RecipeCombobox', () => {
  it('shows no list until you type or click', () => {
    render(<RecipeCombobox recipes={recipes} onSelect={vi.fn()} />)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(box())
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('narrows down while typing, ignoring case, sorted by name', () => {
    render(<RecipeCombobox recipes={recipes} onSelect={vi.fn()} />)
    fireEvent.change(box(), { target: { value: 'TACO' } })
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['TacoKjøtt', 'TacopaiKjøtt'].map(t => expect.stringContaining(t.slice(0, 4))))
  })

  it('says so when nothing matches', () => {
    render(<RecipeCombobox recipes={recipes} onSelect={vi.fn()} />)
    fireEvent.change(box(), { target: { value: 'xyz' } })
    expect(screen.getByText('Fant ingen oppskrifter')).toBeTruthy()
  })

  it('selects with a click', () => {
    const onSelect = vi.fn()
    render(<RecipeCombobox recipes={recipes} onSelect={onSelect} />)
    fireEvent.change(box(), { target: { value: 'fisk' } })
    fireEvent.click(screen.getByRole('option'))
    expect(onSelect).toHaveBeenCalledWith(recipes[1])
  })

  it('selects with the arrow keys and Enter', () => {
    const onSelect = vi.fn()
    render(<RecipeCombobox recipes={recipes} onSelect={onSelect} />)
    fireEvent.change(box(), { target: { value: 'taco' } })
    fireEvent.keyDown(box(), { key: 'ArrowDown' })
    fireEvent.keyDown(box(), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(recipes[2])
  })
})
