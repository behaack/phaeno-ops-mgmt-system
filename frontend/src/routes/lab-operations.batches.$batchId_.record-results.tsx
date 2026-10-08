import { createFileRoute } from '@tanstack/react-router'
import { VendorResultsWorkspacePage } from '#/features/lab-operations/VendorResultsWorkspacePage'
export const Route = createFileRoute('/lab-operations/batches/$batchId_/record-results')({ component: ResultsRoute })
function ResultsRoute() { const { batchId } = Route.useParams(); return <VendorResultsWorkspacePage key={batchId} batchId={batchId} /> }
