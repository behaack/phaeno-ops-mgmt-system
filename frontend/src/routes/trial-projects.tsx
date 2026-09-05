import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { TrialProjectsPage } from '#/features/trials/TrialProjectsPage'
export const Route = createFileRoute('/trial-projects')({ validateSearch: (search: Record<string, unknown>): { q?: string; status?: string; owner?: string; requestId?: string; fromCompanyId?: string } => ({ q: typeof search.q === 'string' ? search.q : '', status: typeof search.status === 'string' ? search.status : '', owner: typeof search.owner === 'string' ? search.owner : '', requestId: typeof search.requestId === 'string' ? search.requestId : undefined, fromCompanyId: typeof search.fromCompanyId === 'string' ? search.fromCompanyId : undefined }), component: TrialProjectsRoute })
function TrialProjectsRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/trial-projects' })
  const { q, status, owner, requestId, fromCompanyId } = Route.useSearch(); const navigate = Route.useNavigate()
  return isDetail ? <Outlet /> : <TrialProjectsPage key={`${requestId ?? ''}:${fromCompanyId ?? ''}`} search={q ?? ''} status={status ?? ''} owner={owner ?? ''} requestId={requestId} fromCompanyId={fromCompanyId} onFilter={values => { void navigate({ search: { q, status, owner, fromCompanyId, requestId, ...values }, replace: true }) }} />
}
