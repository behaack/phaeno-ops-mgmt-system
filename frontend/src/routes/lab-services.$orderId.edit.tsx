import { createFileRoute } from '@tanstack/react-router'

import { LabServiceCreatePage } from '#/features/orders/LabServiceCreatePage'

export const Route = createFileRoute('/lab-services/$orderId/edit')({ component: LabServiceEditRoute })

function LabServiceEditRoute() {
  const { orderId } = Route.useParams()
  return <LabServiceCreatePage orderId={orderId} />
}
