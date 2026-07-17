import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage } from '#/features/lab-operations/LabOperationsPage'

export const Route = createFileRoute('/lab-operations')({ component: LabOperationsRoute })

function LabOperationsRoute() {
  const isChild = useRouterState({ select: (state) => state.location.pathname !== '/lab-operations' })
  return isChild ? <Outlet /> : <LabOperationsPage />
}
