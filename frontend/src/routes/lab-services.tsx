import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { LabServicesPage } from '#/features/orders/LabServicesPage'

export const Route = createFileRoute('/lab-services')({ component: LabServicesRoute })

function LabServicesRoute() {
  const isChildRoute = useRouterState({ select: (state) => state.location.pathname !== '/lab-services' })
  return isChildRoute ? <Outlet /> : <LabServicesPage />
}
