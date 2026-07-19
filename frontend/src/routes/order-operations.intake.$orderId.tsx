import { createFileRoute } from '@tanstack/react-router'

import { OrderIntakePage } from '#/features/orders/OrderIntakePage'

export const Route = createFileRoute('/order-operations/intake/$orderId')({
  component: OrderIntakeRoute,
})

function OrderIntakeRoute() {
  return <OrderIntakePage orderId={Route.useParams().orderId} />
}
