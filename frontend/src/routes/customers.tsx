import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { CrmPortalAccessPage } from '#/features/crm/CrmPortalAccessPage'
import { CrmShell } from '#/features/crm/CrmShell'

export const Route = createFileRoute('/customers')({
  component: LegacyCompaniesRoute,
})

function LegacyCompaniesRoute() {
  const isDetail = useRouterState({
    select: (state) => state.location.pathname !== '/customers',
  })

  return isDetail ? <Outlet /> : (
    <CrmShell>
      <CrmPortalAccessPage />
    </CrmShell>
  )
}
