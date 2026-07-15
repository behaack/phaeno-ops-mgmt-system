import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { ReagentOrdersPage } from '#/features/orders/ReagentOrdersPage'

export const Route = createFileRoute('/reagent-orders')({ component: ReagentOrdersRoute })

function ReagentOrdersRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/reagent-orders' })
  return isChildRoute ? <Outlet /> : <ReagentOrdersPage />
}
