import { PageTitle } from '#/components/ui/page-header'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Mail, Send, MailCheck } from 'lucide-react'
import {
  completeWebOpsDemoRequest, getWebOpsDemoRequests, getWebOpsMailingList,
  unsubscribeWebOpsMailingListContact,
} from '#/api/web-ops'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Button } from '#/components/ui/button'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { WebOpsDashboardContent } from '#/features/dashboard/WebOpsDashboardContent'
import { WebOpsDeliveryPanel } from '#/features/dashboard/WebOpsDeliveryPanel'
import { mockMailingListPage, mockDemoRequestPage } from './mock-queues'
import { parseWebsiteOperationsSearch, websiteOperationsSection, type WebsiteOperationsSection } from './website-operations-search'

export function WebsiteOperationsWorkspace() {
  const { session, isLoading, selectedOrganizationId } = usePhaenoSession()
  const membership = getSelectedMembership(session, selectedOrganizationId)
  if (isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading Website operations…</p></main>
  if (session?.state !== 'ready' || !session.isPlatformAdmin || membership?.organizationKind !== 'Phaeno') {
    return <main className="page-wrap space-y-3 px-4 py-8">
      <PageTitle>Website operations</PageTitle>
      <p>Website operations requires a Phaeno platform administrator in the Phaeno organization.</p>
    </main>
  }
  return <WebsiteOperationsQueues key={`${session.user?.id}:${selectedOrganizationId}`} />
}

function WebsiteOperationsQueues() {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const search = parseWebsiteOperationsSearch(useSearch({ strict: false }))
  const navigate = useNavigate()
  const client = useQueryClient()
  const section = websiteOperationsSection(search)
  const mailingListPage = search.mailingListPage ?? 1
  const demoRequestPage = search.demoRequestPage ?? 1
  const connected = authProvider !== 'mock'
  const scope = [session?.user?.id, selectedOrganizationId]
  const mailingList = useQuery({
    queryKey: ['web-ops', ...scope, 'mailing-list', mailingListPage],
    queryFn: () => getWebOpsMailingList(mailingListPage), enabled: connected,
    refetchInterval: 30_000,
  })
  const demoRequests = useQuery({
    queryKey: ['web-ops', ...scope, 'demo-requests', demoRequestPage, search.requestId],
    queryFn: () => getWebOpsDemoRequests(search.requestId ? 1 : demoRequestPage, search.requestId), enabled: connected,
    refetchInterval: 30_000,
  })
  const allDemoRequests = useQuery({
    queryKey: ['web-ops', ...scope, 'demo-requests', 1, undefined],
    queryFn: () => getWebOpsDemoRequests(1), enabled: connected && Boolean(search.requestId),
    refetchInterval: search.requestId ? 30_000 : false,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ['web-ops'] })
  const unsubscribe = useMutation({ mutationFn: unsubscribeWebOpsMailingListContact, onSuccess: refresh })
  const complete = useMutation({ mutationFn: completeWebOpsDemoRequest, onSuccess: refresh })
  const mailingListData = connected ? mailingList.data : mockMailingListPage
  const demoRequestData = connected ? demoRequests.data : mockDemoRequestPage
  const items: WorkspaceSidebarItem<WebsiteOperationsSection>[] = [
    { value: 'mailing-list', label: 'Mailing list', description: 'Active Website signups and technical-brief requests.', icon: Mail,
      count: mailingList.isError ? undefined : mailingListData?.totalCount },
    { value: 'demo-requests', label: 'Demo requests', description: 'Open Website demo inquiries.', icon: Send,
      count: connected && search.requestId ? allDemoRequests.isError ? undefined : allDemoRequests.data?.totalCount : demoRequests.isError ? undefined : demoRequestData?.totalCount },
    { value: 'email-delivery', label: 'Email delivery', description: 'Queued messages, delivery attempts and recovery.', icon: MailCheck, separatorBefore: true },
  ]
  return <WorkspaceSidebar workspaceLabel="Website operations" items={items} value={section}
    onValueChange={next => void navigate({ to: '/website-operations', search: { ...search, section: next, requestId: undefined, deliveryId: undefined }, resetScroll: false })}>
    <main className="page-wrap space-y-5 px-4 py-8">
      <header>
        <PageTitle>Website operations</PageTitle>
        <p className="mt-2 text-sm text-muted-foreground">Review public Website intake and email delivery. Select a queue in the sidebar.</p>
      </header>
      {search.requestId && section === 'demo-requests' ? <Button asChild variant="outline">
        <Link to="/website-operations" search={{ ...search, section: 'demo-requests', requestId: undefined, demoRequestPage: undefined }}>View all demo requests</Link>
      </Button> : null}
      <WebOpsDashboardContent panel={section} showHeading={false}
        mailingList={{ data: mailingListData, error: connected ? mailingList.error : null, isLoading: connected && mailingList.isFetching,
          onPageChange: page => void navigate({ to: '/website-operations', search: { ...search, section: 'mailing-list', mailingListPage: page }, resetScroll: false }),
          onRetry: () => void mailingList.refetch(),
          action: connected ? { error: unsubscribe.error, isPending: unsubscribe.isPending, onExecute: contact => unsubscribe.mutateAsync(contact.id), onReset: unsubscribe.reset } : undefined }}
        demoRequests={{ data: demoRequestData, error: connected ? demoRequests.error : null, isLoading: connected && demoRequests.isFetching,
          onPageChange: page => void navigate({ to: '/website-operations', search: { ...search, section: 'demo-requests', demoRequestPage: page }, resetScroll: false }),
          onRetry: () => void demoRequests.refetch(),
          action: connected ? { error: complete.error, isPending: complete.isPending, onExecute: request => complete.mutateAsync(request.id), onReset: complete.reset } : undefined }}
        notificationPanel={connected ? <WebOpsDeliveryPanel /> : <p>Use a connected Phaeno session to inspect email delivery.</p>}
        isMockData={!connected} />
    </main>
  </WorkspaceSidebar>
}
