import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { OrderOperationsPage } from '#/features/orders/OrderOperationsPage'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
export const Route = createFileRoute('/order-operations/partner-services')({
  validateSearch: (search: Record<string, unknown>) => ({ ...parseServiceWorkspaceSearch(search), section: search.section === 'assembly' ? 'assembly' as const : 'kits' as const }),
  component: PartnerServicesRoute,
})
function PartnerServicesRoute() {
  const nested = useRouterState({ select: state => state.location.pathname !== '/order-operations/partner-services' })
  const { section } = Route.useSearch()
  return nested ? <Outlet /> : <OrderOperationsPage workspace="partner-services" initialSection={section === 'assembly' ? 'assembly' : 'reagent'} />
}
