import { createFileRoute } from '@tanstack/react-router'

import { LabManufacturingOrderPage } from '#/features/lab-operations/LabManufacturingPage'

export const Route = createFileRoute('/lab-operations/data-assembly/$orderId')({
  component: DataAssemblyManufacturingRoute,
})

function DataAssemblyManufacturingRoute() {
  return <LabManufacturingOrderPage workflow="assembly" orderId={Route.useParams().orderId} />
}
