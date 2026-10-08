import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataProvisioningPage } from '#/features/data-provisioning/DataProvisioningPage'
import { parseDataProvisioningSection } from '#/features/data-provisioning/data-provisioning-sections'

export const Route = createFileRoute('/data-provisioning')({
  validateSearch: (search: Record<string, unknown>) => ({ section: parseDataProvisioningSection(search.section) }),
  component: DataProvisioningRoute,
})

function DataProvisioningRoute() {
  const { section } = Route.useSearch()
  const navigate = Route.useNavigate()
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/data-provisioning',
  })

  return isChildRoute ? <Outlet /> : <DataProvisioningPage section={section} onSectionChange={section => { void navigate({ to: '/data-provisioning', search: { section }, resetScroll: false }) }} />
}
