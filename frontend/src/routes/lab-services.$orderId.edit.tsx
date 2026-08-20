import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LabServiceDetailPage } from '#/features/orders/LabServiceDetailPage'

export const Route = createFileRoute('/lab-services/$orderId/edit')({ component: LabServiceEditRoute })

function LabServiceEditRoute() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <LabServiceDetailPage
      orderId={orderId}
      initialJobDetailsOpen
      onJobDetailsOpenChange={(open) => {
        if (!open) {
          void navigate({
            to: '/lab-services/$orderId',
            params: { orderId },
          })
        }
      }}
    />
  )
}
