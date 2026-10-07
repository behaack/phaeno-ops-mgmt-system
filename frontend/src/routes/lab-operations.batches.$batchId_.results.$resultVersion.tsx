import { createFileRoute } from '@tanstack/react-router'
import { VendorResultsVersionPage } from '#/features/lab-operations/VendorResultsVersionPage'

export const Route = createFileRoute('/lab-operations/batches/$batchId_/results/$resultVersion')({ component: VersionRoute })
function VersionRoute() {
  const { batchId, resultVersion } = Route.useParams()
  return <VendorResultsVersionPage batchId={batchId} resultVersion={Number(resultVersion)} />
}
