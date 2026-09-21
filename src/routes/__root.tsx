import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import React from 'react'
import Header from '../components/Header'
import SimpleModeGuard from '../components/SimpleModeGuard'
import { ToastProvider } from '../components/ui/toast'
import { isChunkLoadError, reloadOnceForNewVersion } from '../lib/chunk-reload'
import appCss from '../styles.css?url'

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-4xl font-bold mb-4">404 – Siden finnes ikke</h1>
      <p className="text-muted-foreground mb-6">Siden du leter etter finnes ikke.</p>
      <a href="/" className="text-primary hover:underline">Tilbake til forsiden</a>
    </div>
  )
}

function RootErrorComponent({ error }: { error: unknown }) {
  const staleVersion = isChunkLoadError(error)

  // A script of the app couldn't be loaded, usually because a newer version was deployed since
  // this page was opened: fetch the current version once instead of showing an error
  React.useEffect(() => {
    if (staleVersion) reloadOnceForNewVersion()
  }, [staleVersion])

  if (staleVersion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Ny versjon tilgjengelig</h1>
        <p className="text-muted-foreground mb-6">Laster siden på nytt ...</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-primary hover:underline"
        >
          Last siden på nytt
        </button>
      </div>
    )
  }

  // Handle thrown Response (redirects or fetch errors)
  if (error instanceof Response) {
    if (error.status === 404) {
      return <NotFoundComponent />
    }
    // For redirects, let the router handle it, but show a fallback if not
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <h1 className="text-3xl font-bold mb-4">Videresender ...</h1>
        <p className="text-muted-foreground mb-6">Du blir videresendt. Hvis ingenting skjer, <a href="/" className="text-primary hover:underline">klikk her</a>.</p>
      </div>
    )
  }
  // Generic error fallback
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-4xl font-bold mb-4">Noe gikk galt!</h1>
      <p className="text-muted-foreground mb-6">{error instanceof Error ? error.message : String(error)}</p>
      <a href="/" className="text-primary hover:underline">Tilbake til forsiden</a>
    </div>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Matbingo – familiens matplanlegger',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,

  beforeLoad: async ({ location }) => {
    // Allow login page and auth API
    if (location.pathname === '/login' || location.pathname.startsWith('/api/auth')) {
      return
    }
  },

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Vite reports a failed dynamic import (e.g. a file from an older deployment) with this event
  React.useEffect(() => {
    const handlePreloadError = (event: Event) => {
      event.preventDefault()
      reloadOnceForNewVersion()
    }
    window.addEventListener('vite:preloadError', handlePreloadError)
    return () => window.removeEventListener('vite:preloadError', handlePreloadError)
  }, [])

  return (
    <html lang="nb">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <SimpleModeGuard />
            <main className="container mx-auto px-4 py-4 sm:py-8">
              {children}
            </main>
          </div>
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}
