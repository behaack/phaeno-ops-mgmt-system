import { parseExternalOrderListSearch } from '#/features/orders/external-order-list-search'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataAssemblyPage } from '#/features/orders/DataAssemblyPage'

export const Route = createFileRoute('/data-assembly')({ validateSearch: parseExternalOrderListSearch, component: DataAssemblyRoute })

function DataAssemblyRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/data-assembly' })
  return isChildRoute ? <Outlet /> : <DataAssemblyPage />
}
