import { createFileRoute } from '@tanstack/react-router'
import { BasketEditor } from '../../components/basket-editor'

export const Route = createFileRoute('/baskets/new')({
  component: () => <BasketEditor />,
})
