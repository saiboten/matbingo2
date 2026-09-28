import { createFileRoute, redirect } from '@tanstack/react-router'

// There used to be many lists here; the family's one list is now the home page
export const Route = createFileRoute('/shopping-lists/')({
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})
