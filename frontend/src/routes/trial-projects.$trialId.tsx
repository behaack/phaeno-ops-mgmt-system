import { Navigate, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
export const Route = createFileRoute('/trial-projects/$trialId')({ component: LegacyTrialRoute })
function LegacyTrialRoute() {
  const nested = useRouterState({ select: state => state.location.pathname.endsWith('/scope') })
  const params = Route.useParams()
  const search = Route.useSearch()
  return nested ? <Outlet /> : <Navigate to="/order-operations/lab-services/trials/$trialId" params={params} search={search} replace />
}
