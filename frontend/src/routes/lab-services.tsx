import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { LabServicesPage } from '#/features/orders/LabServicesPage'

export const Route = createFileRoute('/lab-services')({ component: LabServicesRoute })

function LabServicesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname === '/lab-services/new') {
    return (
      <>
        <LabServicesPage />
        <Outlet />
      </>
    )
  }

  return pathname === '/lab-services' ? <LabServicesPage /> : <Outlet />
}
