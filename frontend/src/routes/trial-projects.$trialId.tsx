import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { TrialDetailPage } from '#/features/trials/TrialDetailPage'
export const Route = createFileRoute('/trial-projects/$trialId')({ component: TrialDetailRoute })
function TrialDetailRoute() {
  const { trialId } = Route.useParams()
  const nested = useRouterState({ select: state => state.location.pathname.endsWith('/scope') })
  return nested ? <Outlet /> : <TrialDetailPage trialId={trialId} />
}
