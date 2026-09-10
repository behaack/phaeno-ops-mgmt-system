import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { LabServiceDetailPage } from '#/features/orders/LabServiceDetailPage'
import { parseLabJobWorkspaceSearch } from '#/features/orders/lab-job-workspace-search'

export const Route = createFileRoute('/lab-services/$orderId')({ validateSearch: parseLabJobWorkspaceSearch, component: LabServiceDetailRoute })

function LabServiceDetailRoute() {
  const { orderId } = Route.useParams()
  const workspace = Route.useSearch()
  const navigate = Route.useNavigate()
  const isEditRoute = useRouterState({ select: (state) => state.location.pathname.endsWith('/edit') })
  return isEditRoute ? <Outlet /> : <LabServiceDetailPage key={orderId} orderId={orderId} workspace={workspace} onWorkspaceChange={(patch, options) => navigate({ search: previous => ({ ...previous, ...patch }), resetScroll: false, ignoreBlocker: options?.afterSave === true })} />
}
