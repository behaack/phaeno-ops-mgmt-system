import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { ReagentOrderDetailPage } from '#/features/orders/ReagentOrderDetailPage'

export const Route = createFileRoute('/reagent-orders/$orderId')({ component: ReagentOrderDetailRoute })

function ReagentOrderDetailRoute() {
  const { orderId } = Route.useParams()
  const isEditRoute = useRouterState({ select: (state) => state.location.pathname.endsWith('/edit') })
  return isEditRoute ? <Outlet /> : <ReagentOrderDetailPage orderId={orderId} />
}
