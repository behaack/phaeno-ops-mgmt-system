import { createFileRoute } from '@tanstack/react-router'

import { ReagentOrderCreatePage } from '#/features/orders/ReagentOrderCreatePage'

export const Route = createFileRoute('/reagent-orders/$orderId/edit')({ component: ReagentOrderEditRoute })

function ReagentOrderEditRoute() {
  const { orderId } = Route.useParams()
  return <ReagentOrderCreatePage orderId={orderId} />
}
