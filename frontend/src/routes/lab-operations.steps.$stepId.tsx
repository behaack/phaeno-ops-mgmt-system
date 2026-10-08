import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { LabStepPage } from '#/features/lab-operations/LabSteps'
export const Route = createFileRoute('/lab-operations/steps/$stepId')({ component: Page })
function Page() {
  const { stepId } = Route.useParams()
  const editing = useRouterState({ select: state => state.matches.some(match => match.routeId === '/lab-operations/steps/$stepId/edit') })
  return editing ? <Outlet /> : <LabStepPage stepId={stepId} />
}
