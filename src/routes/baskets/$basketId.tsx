import { createFileRoute } from '@tanstack/react-router'
import { BasketEditor } from '../../components/basket-editor'

export const Route = createFileRoute('/baskets/$basketId')({
  component: EditBasketPage,
})

function EditBasketPage() {
  const { basketId } = Route.useParams()
  return <BasketEditor key={basketId} basketId={basketId} />
}
