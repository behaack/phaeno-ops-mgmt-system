import { createFileRoute } from '@tanstack/react-router'
import { ScientificEvidencePage } from '#/features/lab-operations/ScientificEvidencePage'

export const Route = createFileRoute('/lab-operations/$workOrderId_/specimens/$specimenId_/evidence/$kind/$recordId')({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({ from: typeof search.from === 'string' ? search.from : undefined }),
  component: ScientificRoute,
})
function ScientificRoute() { return <ScientificEvidencePage {...Route.useParams()} {...Route.useSearch()} /> }
