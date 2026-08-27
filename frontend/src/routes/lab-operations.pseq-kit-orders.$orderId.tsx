import { createFileRoute } from '@tanstack/react-router'

import { LabManufacturingOrderPage } from '#/features/lab-operations/LabManufacturingPage'

export const Route = createFileRoute('/lab-operations/pseq-kit-orders/$orderId')({
  component: PSeqKitManufacturingRoute,
})

function PSeqKitManufacturingRoute() {
  return <LabManufacturingOrderPage workflow="reagent" orderId={Route.useParams().orderId} />
}
