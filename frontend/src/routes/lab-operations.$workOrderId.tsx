import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { LabWorkOrderPage } from '#/features/lab-operations/LabWorkOrderPage'

export const Route = createFileRoute('/lab-operations/$workOrderId')({
  validateSearch: z.object({ packet: z.string().max(100).optional(), tube: z.string().max(100).optional(), tab: z.enum(['specimens', 'execution', 'lineage', 'libraries', 'exceptions', 'review']).optional() }),
  component: LabWorkOrderRoute,
})

function LabWorkOrderRoute() {
  return <LabWorkOrderPage workOrderId={Route.useParams().workOrderId} selectedTab={Route.useSearch().tab} packetBarcode={Route.useSearch().packet} supplierTubeBarcode={Route.useSearch().tube} />
}
