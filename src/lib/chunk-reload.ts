const RELOAD_KEY = 'matbingo:chunk-reload'
const RELOAD_COOLDOWN_MS = 15_000

// True for the errors a browser throws when a script file of the app can't be loaded, which
// typically means the page belongs to an older deployment than the one now being served.
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|importing a module script failed|loading chunk|unable to preload/i.test(message)
}

// Reloads the page once to pick up the current version. Returns false (and does nothing) if it
// already reloaded a moment ago, or if that can't be tracked, so a persistent problem can't loop.
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
