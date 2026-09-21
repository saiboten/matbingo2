// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { rememberScroll, rememberedScroll, routerShouldRestoreScroll } from './scroll-memory'

const enterHistoryEntry = (key: string) => window.history.replaceState({ __TSR_key: key }, '')
const scrollTo = (y: number) => Object.defineProperty(window, 'scrollY', { value: y, configurable: true })

beforeEach(() => {
  scrollTo(0)
  enterHistoryEntry('start')
})

describe('scroll memory for lists', () => {
  it('gives back the position when returning to the history entry it was remembered for', () => {
    enterHistoryEntry('list')
    scrollTo(1500)
    rememberScroll()

    enterHistoryEntry('detail')
    expect(rememberedScroll()).toBe(0)

    enterHistoryEntry('list')
    expect(rememberedScroll()).toBe(1500)
    // asking again (a component rendering twice) gives the same answer
    expect(rememberedScroll()).toBe(1500)
  })

  it('starts at the top on any other visit to the list, such as a click on the menu', () => {
    enterHistoryEntry('list')
    scrollTo(900)
    rememberScroll()
    enterHistoryEntry('new-visit')
    expect(rememberedScroll()).toBe(0)
  })

  it('remembers only the latest position', () => {
    enterHistoryEntry('list')
    scrollTo(300)
    rememberScroll()
    scrollTo(700)
    rememberScroll()
    expect(rememberedScroll()).toBe(700)
  })

  it('does nothing before anything was remembered', () => {
    expect(rememberedScroll()).toBe(0)
  })
})

describe('routerShouldRestoreScroll', () => {
  it('leaves the recipe list to itself and the router in charge of every other page', () => {
    expect(routerShouldRestoreScroll('/recipes')).toBe(false)
    expect(routerShouldRestoreScroll('/recipes/abc')).toBe(true)
    expect(routerShouldRestoreScroll('/')).toBe(true)
    expect(routerShouldRestoreScroll('/shopping-lists')).toBe(true)
  })
})
