import { createFileRoute } from '@tanstack/react-router'

import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'

export const Route = createFileRoute('/order-operations/$workflow/$orderId')({ component: OrderOperationalDetailRoute })

function OrderOperationalDetailRoute() {
  const { workflow, orderId } = Route.useParams()
  if (workflow !== 'lab' && workflow !== 'reagent' && workflow !== 'assembly') return <main className="page-wrap px-4 py-8"><h1 className="text-2xl font-semibold">Unknown order workflow</h1></main>
  return <OrderOperationsPage workflow={workflow} orderId={orderId} />
}
