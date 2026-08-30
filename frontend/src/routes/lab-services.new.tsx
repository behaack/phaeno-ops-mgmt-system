import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { LabJobDetailsDialog } from '#/features/orders/LabJobDetailsDialog'

export const Route = createFileRoute('/lab-services/new')({
  component: LabServiceCreateRoute,
})

function LabServiceCreateRoute() {
  const navigate = useNavigate()

  return (
    <LabJobDetailsDialog
      open
      onOpenChange={(open) => {
        if (!open) void navigate({ to: '/lab-services' })
      }}
      onSaved={(order) =>
        navigate({
          to: '/lab-services/$orderId',
          params: { orderId: order.id },
        })
      }
    />
  )
}
