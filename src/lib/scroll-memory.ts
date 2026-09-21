// Remembers how far a list was scrolled when a card was opened, so that going back puts the page where it
// was. The router's own scroll restoration only records the position of pages it renders itself; a list
// that fills in after a fetch ends up on top, so lists that need this handle it here (see
// `scrollRestoration` in router.tsx, which leaves those pages alone).
//
// A position belongs to one entry in the browser history (its __TSR_key). Going back to that entry
// restores it; arriving any other way (menu link, new visit) starts at the top.

let remembered: { key: string | undefined; y: number } | null = null

function currentKey(): string | undefined {
  try {
    return window.history.state?.__TSR_key
  } catch {
    return undefined
  }
}

// Call when leaving the list for a detail page
export function rememberScroll(): void {
  remembered = { key: currentKey(), y: window.scrollY }
}

// Where the page should be scrolled to now: the remembered position if this is the history entry it was
// remembered for (going back), else 0. Asking twice gives the same answer, so a component that renders
// twice (React strict mode) is not a problem; a new visit is a new history entry and never matches.
export function rememberedScroll(): number {
  return remembered && remembered.key !== undefined && remembered.key === currentKey() ? remembered.y : 0
}

// Pages that scroll themselves; the router leaves these alone
const SELF_SCROLLING_PATHS = ['/recipes']

export function routerShouldRestoreScroll(pathname: string): boolean {
  return !SELF_SCROLLING_PATHS.includes(pathname)
}
