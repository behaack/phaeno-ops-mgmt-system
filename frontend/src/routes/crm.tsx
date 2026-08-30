import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { CrmHomePage } from '#/features/crm/CrmHomePage'
import { CrmShell } from '#/features/crm/CrmShell'

export const Route = createFileRoute('/crm')({
  component: CrmRoute,
})

function CrmRoute() {
  const isDetail = useRouterState({
    select: (state) => state.location.pathname !== '/crm',
  })

  return <CrmShell>{isDetail ? <Outlet /> : <CrmHomePage />}</CrmShell>
}
