import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { OrganizationListPage } from '#/features/organizations/OrganizationListPage'

export const Route = createFileRoute('/customers')({
  component: OrganizationsRoute,
})

function OrganizationsRoute() {
  const isDetail = useRouterState({
    select: (state) => state.location.pathname !== '/customers',
  })

  return isDetail ? <Outlet /> : <OrganizationListPage />
}
