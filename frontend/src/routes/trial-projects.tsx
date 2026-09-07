import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { OrderOperationsSidebar } from '#/features/orders/OrderOperationsSidebar'
import { TrialProjectsPage } from '#/features/trials/TrialProjectsPage'
export const Route = createFileRoute('/trial-projects')({ validateSearch: (search: Record<string, unknown>): { q?: string; status?: string; owner?: string; requestId?: string; fromCompanyId?: string } => ({ q: typeof search.q === 'string' ? search.q : '', status: typeof search.status === 'string' ? search.status : '', owner: typeof search.owner === 'string' ? search.owner : '', requestId: typeof search.requestId === 'string' ? search.requestId : undefined, fromCompanyId: typeof search.fromCompanyId === 'string' ? search.fromCompanyId : undefined }), component: TrialProjectsRoute })
function TrialProjectsRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/trial-projects' })
  const { q, status, owner, requestId, fromCompanyId } = Route.useSearch(); const navigate = Route.useNavigate()
  const { session, selectedOrganizationId } = usePhaenoSession()
  const internal = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno'
  const content = isDetail ? <Outlet /> : <TrialProjectsPage key={`${requestId ?? ''}:${fromCompanyId ?? ''}`} search={q ?? ''} status={status ?? ''} owner={owner ?? ''} requestId={requestId} fromCompanyId={fromCompanyId} onFilter={values => { void navigate({ search: { q, status, owner, fromCompanyId, requestId, ...values }, replace: true }) }} />
  return internal && session?.capabilities.canViewTrialProjects ? <OrderOperationsSidebar section="trials">{content}</OrderOperationsSidebar> : content
}
