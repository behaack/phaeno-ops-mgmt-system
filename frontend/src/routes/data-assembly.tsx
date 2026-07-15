import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataAssemblyPage } from '#/features/orders/DataAssemblyPage'

export const Route = createFileRoute('/data-assembly')({ component: DataAssemblyRoute })

function DataAssemblyRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/data-assembly' })
  return isChildRoute ? <Outlet /> : <DataAssemblyPage />
}
