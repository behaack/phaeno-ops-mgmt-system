import { createFileRoute } from '@tanstack/react-router'
import { SequencingBatchPage } from '#/features/lab-operations/SequencingBatchPage'

export const Route = createFileRoute('/lab-operations/batches/$batchId')({ component: BatchRoute })
function BatchRoute() { const { batchId } = Route.useParams(); return <SequencingBatchPage key={batchId} batchId={batchId} /> }
