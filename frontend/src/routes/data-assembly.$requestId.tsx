import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataAssemblyDetailPage } from '#/features/orders/DataAssemblyDetailPage'

export const Route = createFileRoute('/data-assembly/$requestId')({ component: DataAssemblyDetailRoute })

function DataAssemblyDetailRoute() {
  const { requestId } = Route.useParams()
  const isEditRoute = useRouterState({ select: (state) => state.location.pathname.endsWith('/edit') })
  return isEditRoute ? <Outlet /> : <DataAssemblyDetailPage requestId={requestId} />
}
