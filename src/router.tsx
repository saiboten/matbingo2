import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { routerShouldRestoreScroll } from './lib/scroll-memory'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},

    // The recipe list puts the scroll position back itself (it fills in after loading, see lib/scroll-memory.ts)
    scrollRestoration: ({ location }) => routerShouldRestoreScroll(location.pathname),
    defaultPreloadStaleTime: 0,
  })

  return router
}
