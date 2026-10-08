import { Navigate, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { usePhaenoSession } from '#/features/auth/session-context'
import { getOrderLandingSection } from '#/features/orders/order-sections'
import { parseServiceWorkspaceSearch } from '#/features/orders/service-workspace-search'
import { serviceSectionRoute, serviceSectionSearch } from '#/features/orders/service-workspaces'
export const Route = createFileRoute('/order-operations')({ validateSearch: parseServiceWorkspaceSearch, component: OrderOperationsRoute })
function OrderOperationsRoute() {
  const nested = useRouterState({ select: state => state.location.pathname !== '/order-operations' })
  const search = Route.useSearch()
  const { session } = usePhaenoSession()
  if (nested) return <Outlet />
  if (!session || session.state !== 'ready') return <main className="page-wrap p-8" role="status">Loading Order operations…</main>
  const section = getOrderLandingSection(session?.capabilities, search.orderSection)
  return <Navigate to={section ? serviceSectionRoute(section) : '/'} search={{ ...search, ...(section ? serviceSectionSearch(section) : {}), orderSection: undefined }} replace />
}
