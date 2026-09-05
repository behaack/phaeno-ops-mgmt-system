import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { TrialProjectsPage } from '#/features/trials/TrialProjectsPage'
export const Route = createFileRoute('/trial-projects')({ validateSearch: (search: Record<string, unknown>): { q?: string; status?: string; owner?: string } => ({ q: typeof search.q === 'string' ? search.q : '', status: typeof search.status === 'string' ? search.status : '', owner: typeof search.owner === 'string' ? search.owner : '' }), component: TrialProjectsRoute })
function TrialProjectsRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/trial-projects' })
  const { q, status, owner } = Route.useSearch(); const navigate = Route.useNavigate()
  return isDetail ? <Outlet /> : <TrialProjectsPage search={q ?? ''} status={status ?? ''} owner={owner ?? ''} onFilter={values => { void navigate({ search: { q, status, owner, ...values }, replace: true }) }} />
}
