import { parseRecordListSearch, type RecordListSearch } from '#/components/RecordPagination'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { OrderOperationsSidebar } from '#/features/orders/OrderOperationsSidebar'
import { TrialProjectsPage } from '#/features/trials/TrialProjectsPage'
export const Route = createFileRoute('/order-operations/lab-services/trials')({ validateSearch: (search: Record<string, unknown>): RecordListSearch & { q?: string; status?: string; owner?: string; requestId?: string; fromCompanyId?: string } => ({ ...parseRecordListSearch(search), q: typeof search.q === 'string' ? search.q : '', status: typeof search.status === 'string' ? search.status : '', owner: typeof search.owner === 'string' ? search.owner : '', requestId: typeof search.requestId === 'string' ? search.requestId : undefined, fromCompanyId: typeof search.fromCompanyId === 'string' ? search.fromCompanyId : undefined }), component: TrialProjectsRoute })
function TrialProjectsRoute() {
  const isDetail = useRouterState({ select: state => state.location.pathname !== '/order-operations/lab-services/trials' })
  const { q, status, owner, requestId, fromCompanyId } = Route.useSearch(); const navigate = Route.useNavigate()
  const { session, selectedOrganizationId } = usePhaenoSession()
  const internal = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno'
  const content = isDetail ? <Outlet /> : <TrialProjectsPage key={`${requestId ?? ''}:${fromCompanyId ?? ''}`} search={q ?? ''} status={status ?? ''} owner={owner ?? ''} requestId={requestId} fromCompanyId={fromCompanyId} onFilter={values => { void navigate({ search: { q, status, owner, fromCompanyId, requestId, ...values, listPage: 1 }, replace: true }) }} />
  return internal && session?.capabilities.canViewTrialProjects ? <OrderOperationsSidebar section="trials">{content}</OrderOperationsSidebar> : content
}
