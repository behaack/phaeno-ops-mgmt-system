import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataProvisioningPage } from '#/features/data-provisioning/DataProvisioningPage'

export const Route = createFileRoute('/data-provisioning')({
  validateSearch: (search: Record<string, unknown>): { section?: 'grants' } => ({ section: search.section === 'grants' ? 'grants' : undefined }),
  component: DataProvisioningRoute,
})

function DataProvisioningRoute() {
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/data-provisioning',
  })

  return isChildRoute ? <Outlet /> : <DataProvisioningPage />
}
