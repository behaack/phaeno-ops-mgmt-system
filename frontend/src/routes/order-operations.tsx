import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'

export const Route = createFileRoute('/order-operations')({ component: OrderOperationsRoute })

function OrderOperationsRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/order-operations' })
  return isChildRoute ? <Outlet /> : <OrderOperationsPage />
}
