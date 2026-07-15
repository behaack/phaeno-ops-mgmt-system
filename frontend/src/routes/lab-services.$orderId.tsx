import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { LabServiceDetailPage } from '#/features/orders/LabServiceDetailPage'

export const Route = createFileRoute('/lab-services/$orderId')({ component: LabServiceDetailRoute })

function LabServiceDetailRoute() {
  const { orderId } = Route.useParams()
  const isEditRoute = useRouterState({ select: (state) => state.location.pathname.endsWith('/edit') })
  return isEditRoute ? <Outlet /> : <LabServiceDetailPage orderId={orderId} />
}
