import { createFileRoute } from '@tanstack/react-router'
import { ReagentRunPage } from '#/features/lab-operations/ReagentManufacturingWorkspace'

export const Route = createFileRoute('/lab-operations/reagent-runs/$runId')({ component: ReagentRunRoute })

function ReagentRunRoute() {
  const { runId } = Route.useParams()
  return <ReagentRunPage key={runId} runId={runId} />
}
