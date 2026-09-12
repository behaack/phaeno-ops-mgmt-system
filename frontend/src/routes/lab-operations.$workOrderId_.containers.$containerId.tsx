import { createFileRoute } from '@tanstack/react-router'
import { LabTubePage } from '#/features/lab-operations/LabTubePage'

export const Route = createFileRoute('/lab-operations/$workOrderId_/containers/$containerId')({ component: TubeRoute })
function TubeRoute() { const { workOrderId, containerId } = Route.useParams(); return <LabTubePage workOrderId={workOrderId} containerId={containerId} /> }
