import { createFileRoute, redirect } from '@tanstack/react-router'

// The simple mode used to have its own page; the shopping list is now the home page for everyone
export const Route = createFileRoute('/simple')({
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})
