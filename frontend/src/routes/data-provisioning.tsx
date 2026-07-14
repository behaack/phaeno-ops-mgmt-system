import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataProvisioningPage } from '#/features/data-provisioning/DataProvisioningPage'

export const Route = createFileRoute('/data-provisioning')({
  component: DataProvisioningRoute,
})

function DataProvisioningRoute() {
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/data-provisioning',
  })

  return isChildRoute ? <Outlet /> : <DataProvisioningPage />
}
