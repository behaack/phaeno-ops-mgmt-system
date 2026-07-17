import { createFileRoute } from '@tanstack/react-router'

import { LabWorkOrderPage } from '#/features/lab-operations/LabWorkOrderPage'

export const Route = createFileRoute('/lab-operations/$workOrderId')({
  component: LabWorkOrderRoute,
})

function LabWorkOrderRoute() {
  return <LabWorkOrderPage workOrderId={Route.useParams().workOrderId} />
}
