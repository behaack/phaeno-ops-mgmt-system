import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/lab-services')({ validateSearch: parseServiceWorkspaceSearch, component: LabServicesRoute })
function LabServicesRoute() {
  const nested = useRouterState({ select: state => state.location.pathname !== '/order-operations/lab-services' })
  return nested ? <Outlet /> : <OrderOperationsPage workspace="lab-services" />
}
