import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/finance')({ validateSearch: parseServiceWorkspaceSearch, component: FinanceRoute })
function FinanceRoute() {
  const nested = useRouterState({ select: state => state.location.pathname !== '/finance' })
  return nested ? <Outlet /> : <OrderOperationsPage workspace="finance" />
}
