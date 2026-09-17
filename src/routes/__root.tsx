import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import React from 'react'
import Header from '../components/Header'
import appCss from '../styles.css?url'

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="text-primary hover:underline">Go back home</a>
    </div>
  )
}

function RootErrorComponent({ error }: { error: unknown }) {
  // Handle thrown Response (redirects or fetch errors)
  if (error instanceof Response) {
    if (error.status === 404) {
      return <NotFoundComponent />
    }
    // For redirects, let the router handle it, but show a fallback if not
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <h1 className="text-3xl font-bold mb-4">Redirecting...</h1>
        <p className="text-muted-foreground mb-6">You are being redirected. If nothing happens, <a href="/" className="text-primary hover:underline">click here</a>.</p>
      </div>
    )
  }
  // Generic error fallback
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
      <p className="text-muted-foreground mb-6">{error instanceof Error ? error.message : String(error)}</p>
      <a href="/" className="text-primary hover:underline">Go back home</a>
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
        title: 'Family Recipe Planner',
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
