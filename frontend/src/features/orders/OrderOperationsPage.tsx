import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { formatDisplayTimestamp, formatDisplayCurrency } from '#/lib/display-format'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { confirmPortal } from '#/components/PortalConfirmation'
import { commercialRecordRoute } from '#/features/orders/service-workspaces'
import { LabPhasesPanel } from './LabPhasesPanel'
import { LabServiceTimingPanel } from './LabServiceTimingPanel'
import { StandardLabServicePanel } from './StandardLabServicePanel'
import { KitAssemblyCasesPanel } from './KitAssemblyCasesPanel'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getCommercialPricingCatalog, getOrderConfiguration, getOrderErrorMessage, getPlatformOrder, listIntegrationMessages, listNotificationMessages, listPlatformOrders, retryIntegrationMessage, retryNotificationMessage, runPlatformAction, updateOperationalAssignment, type DataAssemblyRequest, type IntegrationMessage, type LabServiceOrder, type NotificationMessage, type PagedResult, type Quote, type ReagentOrder } from '#/api/order-management'
import type { SessionCapabilities } from '#/api/session'
import { listOrganizations } from '#/api/data-provisioning'
import { getLabWorkOrderByCommercialOrder } from '#/api/lab-operations'
import { changeShippingJobSafetyHold, getShippingJobSafetyHold } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { OrderOperationsSidebar } from './OrderOperationsSidebar'
import { CommercialSaleSummaryAttention } from './CommercialSaleSummaryAttention'
import { canAccessOperationalAttention, type OrderSection } from './order-sections'
import { getServiceWorkspaceSections, serviceWorkspaces, serviceSectionRoute, serviceSectionSearch, type ServiceWorkspace } from './service-workspaces'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { FieldError } from '#/components/ui/field'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from './use-order-draft-guard'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { CommercialOrderIntakePanel } from './CommercialOrderIntakePanel'
import { CancellationDecisionPanel } from './operations/CancellationDecisionPanel'
import { CommercialDraftDetails } from './CommercialDraftDetails'
import { OrderRichText } from './order-rich-text'
import { PhaseQuoteDialog } from './operations/PhaseQuoteDialog'
import { PlatformQuoteDialog } from './operations/PlatformQuoteDialog'
import { IssueLabChangeQuote } from './LabChangeQuotes'
import { quoteDecisionHistoryLabel } from './quote-decision-history'
import { CompleteLabJob } from './operations/CompleteLabJob'
import { FinanceOperationsPanel, OperationalAttentionPanel } from './PSeqOrderToCashPanels'
import { FinanceSidebar } from './FinanceSidebar'

type Workflow = 'lab' | 'reagent' | 'assembly'
export function OrderOperationsPage({ workflow, orderId, initialSection, workspace = 'lab-services' }: { workflow?: Workflow; orderId?: string; initialSection?: OrderSection; workspace?: ServiceWorkspace }) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const capabilities = session?.capabilities
  const internal = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno'
  const canView = Boolean(internal && (workflow ? capabilities?.canViewAllOperationalOrders : getServiceWorkspaceSections(workspace, capabilities).length))
  const apiEnabled = canView && authProvider !== 'mock'
  if (!canView) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>{workflow ? <CustomerSourceText source={"Service record"} /> : serviceWorkspaces[workspace].title} <CustomerSourceText source={"unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Your current Phaeno responsibilities do not include this workspace."} /></AlertDescription></Alert></main>
  if (workflow && orderId) return <OperationalDetail workflow={workflow} orderId={orderId} apiEnabled={apiEnabled && Boolean(capabilities?.canViewAllOperationalOrders)} userId={session?.user?.id ?? null} />
  return <OperationalQueues key={workspace + initialSection} workspace={workspace} initialSection={initialSection} apiEnabled={apiEnabled} mock={authProvider === 'mock'} userId={session?.user?.id ?? null} capabilities={capabilities!} />
}

function OperationalQueues({ apiEnabled, mock, userId, capabilities, initialSection, workspace }: { workspace: ServiceWorkspace; initialSection?: OrderSection; apiEnabled: boolean; mock: boolean; userId: string | null; capabilities: SessionCapabilities }) {
  const __customerSource = useCustomerSourceText()

  const navigate = useNavigate()
  const sections = getServiceWorkspaceSections(workspace, capabilities)
  const section = sections.find(item => item.value === initialSection)?.value ?? sections[0]?.value
  const definition = serviceWorkspaces[workspace]
  const setSection = (value: OrderSection) => { void navigate({ to: serviceSectionRoute(value), search: serviceSectionSearch(value) }) }
  const organizations = useQuery({ queryKey: ['order-operations', 'organizations'], queryFn: listOrganizations, enabled: apiEnabled && capabilities.canManageOrderConfiguration && (section === 'intake' || section === 'reagent' || section === 'assembly') })
  const integrations = useQuery({ queryKey: ['order-integrations'], queryFn: () => listIntegrationMessages(), enabled: apiEnabled && capabilities.canManageOrderConfiguration && section === 'integrations' })
  const notifications = useQuery({ queryKey: ['order-notifications'], queryFn: () => listNotificationMessages(), enabled: apiEnabled && capabilities.canManageOrderConfiguration && section === 'integrations' })
  const organizationOptions = organizations.data?.map((item) => ({ id: item.id, name: item.name, kind: item.kind })) ?? []
  if (!section) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>{definition.title} <CustomerSourceText source={"unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Your current responsibilities do not include this workspace."} /></AlertDescription></Alert></main>
  if (section === 'trials') return <Navigate to="/order-operations/lab-services/trials" replace />
  return (
    <main className="py-8">
      <ServiceWorkspaceLayout section={section} onSectionChange={setSection}>
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            {workspace === 'attention' ? <BackLink asChild><Link to="/"><CustomerSourceText source={"Back to Dashboard"} /></Link></BackLink> : null}
            <PageTitle>{definition.title}</PageTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {definition.description}
            </p>
          </section>
          {mock ? (
            <Alert className="mb-5">
              <AlertTitle><CustomerSourceText source={"Connected queues are paused in mock-session mode"} /></AlertTitle>
              <AlertDescription><CustomerSourceText source={"Use a real Phaeno session to work operational orders."} /></AlertDescription>
            </Alert>
          ) : null}
          {section === 'intake' ? <CommercialOrderIntakePanel canCreate={Boolean(capabilities.canQuoteLabServiceWork)} apiEnabled={apiEnabled} mock={mock} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'reagent' ? <QueueCard title={__customerSource("PSeq kit queue")} workflow="reagent" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'assembly' ? <QueueCard title={__customerSource("Data assembly queue")} workflow="assembly" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'attention' ? <>{canAccessOperationalAttention(capabilities) ? <OperationalAttentionPanel apiEnabled={apiEnabled} userId={userId} canBill={capabilities.canManagePSeqBilling} canManageCash={capabilities.canManagePSeqCash} canReconcile={capabilities.canReconcilePSeqCash} /> : null}<CommercialSaleSummaryAttention enabled={apiEnabled && capabilities.canManageOrderConfiguration} /></> : null}
          {section === 'finance' ? <FinanceOperationsPanel apiEnabled={apiEnabled} canBill={capabilities.canManagePSeqBilling} canManageCash={capabilities.canManagePSeqCash} canReconcile={capabilities.canReconcilePSeqCash} canViewCommercialOrder={capabilities.canManageOrderConfiguration} /> : null}
          {section === 'integrations' ? <IntegrationQueue query={integrations} notifications={notifications} apiEnabled={apiEnabled} /> : null}
        </div>
      </ServiceWorkspaceLayout>
    </main>
  )
}

function ServiceWorkspaceLayout({ section, onSectionChange, children }: { section: OrderSection; onSectionChange: (section: OrderSection) => void; children: ReactNode }) {
  if (section === 'finance') return <FinanceSidebar>{children}</FinanceSidebar>
  return section === 'intake' || section === 'reagent' || section === 'assembly'
    ? <OrderOperationsSidebar section={section} onSectionChange={onSectionChange}>{children}</OrderOperationsSidebar>
    : children
}

function QueueCard({ title, workflow, apiEnabled, userId, organizations }: { title: string; workflow: Workflow; apiEnabled: boolean; userId: string | null; organizations: Array<{ id: string; name: string }> }) {
  const navigate = useNavigate()
  const searchState = useSearch({ strict: false })
  const search = searchState.queueSearch ?? ''
  const organizationId = searchState.queueOrganization ?? ''
  const status = searchState.queueStatus ?? ''
  const view = searchState.queueView ?? 'all'
  const updatedFrom = searchState.queueFrom ?? ''
  const updatedTo = searchState.queueTo ?? ''
  const page = searchState.queuePage ?? 1
  const setFilter = (patch: { queueSearch?: string; queueOrganization?: string; queueStatus?: string; queueView?: typeof view; queueFrom?: string; queueTo?: string; queuePage?: number }) => { void navigate({ to: '/order-operations/partner-services', search: previous => ({ ...previous, section: workflow === 'assembly' ? 'assembly' : 'kits', queuePage: 1, ...patch }), replace: true }) }
  const setSearch = (value: string) => setFilter({ queueSearch: value })
  const setOrganizationId = (value: string) => setFilter({ queueOrganization: value })
  const setStatus = (value: string) => setFilter({ queueStatus: value })
  const setView = (value: typeof view) => setFilter({ queueView: value })
  const setUpdatedFrom = (value: string) => setFilter({ queueFrom: value })
  const setUpdatedTo = (value: string) => setFilter({ queueTo: value })
  const query = useQuery({ queryKey: ['platform-orders', workflow, search, organizationId, status, view, updatedFrom, updatedTo, page], queryFn: () => listPlatformOrders(workflow, {
    page, pageSize: 25,
    search: search || undefined, organizationId: organizationId || undefined, status: status || undefined,
    assignedToUserId: view === 'mine' ? userId ?? undefined : undefined, unassigned: view === 'unassigned' || undefined,
    overdue: view === 'overdue' || undefined, holds: view === 'holds' || undefined,
    updatedFrom: updatedFrom ? `${updatedFrom}T00:00:00.000Z` : undefined, updatedTo: updatedTo ? nextDate(updatedTo) : undefined,
  }), enabled: apiEnabled })
  return <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>{title}</CardTitle><CardDescription><CustomerSourceText source={"Newest activity first. Filter actionable work, then open a record to assign and operate it."} /></CardDescription><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><PortalField><Label htmlFor={`${workflow}-queue-search`}><CustomerSourceText source={"Search"} /></Label><Input id={`${workflow}-queue-search`}  value={search} onChange={(event) => setSearch(event.target.value)} /></PortalField><PortalField><Label htmlFor={`${workflow}-queue-organization`}><CustomerSourceText source={"Organization"} /></Label><NativeSelect id={`${workflow}-queue-organization`} className="w-full" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value=""><CustomerSourceText source={"All organizations"} /></option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></PortalField><PortalField><Label htmlFor={`${workflow}-queue-status`}><CustomerSourceText source={"Status"} /></Label><NativeSelect id={`${workflow}-queue-status`} className="w-full" value={status} onChange={(event) => setStatus(event.target.value)}><option value=""><CustomerSourceText source={"All statuses"} /></option>{workflowStatuses[workflow].map((item) => <option key={item} value={item}>{humanizeStatus(item)}</option>)}</NativeSelect></PortalField><PortalField><Label htmlFor={`${workflow}-queue-view`}><CustomerSourceText source={"Queue view"} /></Label><NativeSelect id={`${workflow}-queue-view`} className="w-full" value={view} onChange={(event) => setView(event.target.value as typeof view)}><option value="all"><CustomerSourceText source={"All work"} /></option><option value="mine"><CustomerSourceText source={"Assigned to me"} /></option><option value="unassigned"><CustomerSourceText source={"Unassigned"} /></option><option value="overdue"><CustomerSourceText source={"Overdue"} /></option><option value="holds"><CustomerSourceText source={"On hold"} /></option></NativeSelect></PortalField><PortalField><Label htmlFor={`${workflow}-queue-from`}><CustomerSourceText source={"Updated from"} /></Label><Input id={`${workflow}-queue-from`} type="date"  value={updatedFrom} onChange={(event) => setUpdatedFrom(event.target.value)} /></PortalField><PortalField><Label htmlFor={`${workflow}-queue-to`}><CustomerSourceText source={"Updated through"} /></Label><Input id={`${workflow}-queue-to`} type="date"  value={updatedTo} onChange={(event) => setUpdatedTo(event.target.value)} /></PortalField></div><div className="mt-3"><ClearFiltersButton  onClick={() => setFilter({ queueSearch: '', queueOrganization: '', queueStatus: '', queueView: 'all', queueFrom: '', queueTo: '', queuePage: 1 })}></ClearFiltersButton></div></CardHeader><CardContent className="p-4">{query.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Queue could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Try refreshing.')} />}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status"><CustomerSourceText source={"Loading queue…"} /></p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><RecordLink asChild><Link to={commercialRecordRoute(workflow)} params={{ orderId: item.id }} search={previous => previous} >{item.number}</Link></RecordLink><p className="mt-1 text-xs text-muted-foreground">{organizations.find((org) => org.id === item.organizationId)?.name ?? item.organizationId} · {item.reference ?? 'No reference'}</p><p className="mt-1 text-xs text-muted-foreground">{item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned' : <CustomerSourceText source={"Unassigned"} />}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''}</p></div><div className="flex items-center gap-2">{item.isOverdue ? <span className="text-xs font-medium text-destructive"><CustomerSourceText source={"Overdue"} /></span> : null}<OrderStatusBadge status={item.status} /></div></div>)}</div>{!query.isLoading && !query.isError && !query.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground"><CustomerSourceText source={"No records in this queue."} /></p> : null}<div className="mt-4 flex flex-wrap items-center justify-between gap-3">{query.data ? <><p className="text-sm text-muted-foreground">{query.data.totalCount} <CustomerSourceText source={"records · Page"} /> {page} of {Math.max(1, Math.ceil(query.data.totalCount / 25))}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setFilter({ queuePage: page - 1 })}><CustomerSourceText source={"Previous"} /></Button><Button variant="outline" disabled={page * 25 >= query.data.totalCount || query.isFetching} onClick={() => setFilter({ queuePage: page + 1 })}><CustomerSourceText source={"Next"} /></Button></div></> : null}</div></CardContent></Card>
}

function IntegrationQueue({ query, notifications, apiEnabled }: { query: UseQueryResult<PagedResult<IntegrationMessage>, Error>; notifications: UseQueryResult<PagedResult<NotificationMessage>, Error>; apiEnabled: boolean }) {
  const client = useQueryClient()
  const retry = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryIntegrationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-integrations'] }) })
  const retryNotification = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryNotificationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-notifications'] }) })
  return <div className="space-y-5"><Card><CardHeader><CardTitle><CustomerSourceText source={"Legacy accounting connector queue"} /></CardTitle><CardDescription><CustomerSourceText source={"POMS accounts receivable is the active PSeq workflow. This queue remains only for historical connector recovery and non-PSeq records."} /></CardDescription></CardHeader><CardContent>{query.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Integration queue unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Try refreshing.')} />}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status"><CustomerSourceText source={"Loading integration messages…"} /></p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{humanizeStatus(item.operation)} · {item.workflowType}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"Attempts"} /> {item.attemptCount} <CustomerSourceText source={"· Next"} /> {formatDateTime(item.nextAttemptAt)}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' || item.status === 'NeedsAttention' ? <Button type="button" variant="outline" disabled={!apiEnabled || retry.isPending} onClick={() => retry.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" /><CustomerSourceText source={"Retry"} /></Button> : null}</div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle><CustomerSourceText source={"Notification delivery queue"} /></CardTitle><CardDescription><CustomerSourceText source={"Failed transactional email remains visible and can be retried after delivery configuration is corrected."} /></CardDescription></CardHeader><CardContent>{notifications.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Notification queue unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(notifications.error, 'Try refreshing.')} />}</AlertDescription></Alert> : null}{notifications.isLoading ? <p role="status"><CustomerSourceText source={"Loading notification messages…"} /></p> : null}<div className="divide-y">{notifications.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">{item.workflowType} · {humanizeStatus(item.eventType)} <CustomerSourceText source={"· Attempts"} /> {item.attemptCount}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' ? <Button type="button" variant="outline" disabled={!apiEnabled || retryNotification.isPending} onClick={() => retryNotification.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" /><CustomerSourceText source={"Retry"} /></Button> : null}</div></div>)}</div></CardContent></Card></div>
}

function OperationalDetail({ workflow, orderId, apiEnabled, userId }: { workflow: Workflow; orderId: string; apiEnabled: boolean; userId: string | null }) {
  const client = useQueryClient()
  const { session } = usePhaenoSession()
  const canAdminister = Boolean(session?.capabilities.canManageOrderConfiguration)
  const [reasonDialog, setReasonDialog] = useState<string | null>(null)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [shippingHoldAction, setShippingHoldAction] = useState<boolean | null>(null)
  const [shippingHoldReason, setShippingHoldReason] = useState('')
  const actionsTrigger = useRef<HTMLButtonElement>(null)
  function restoreActionFocus(event: Event) {
    event.preventDefault()
    actionsTrigger.current?.focus()
  }
  const order = useQuery({ queryKey: ['platform-order', workflow, orderId], queryFn: () => getPlatformOrder(workflow, orderId), enabled: apiEnabled })
  const shippingHold = useQuery({ queryKey: ['shipping-job-safety-hold', orderId], queryFn: () => getShippingJobSafetyHold(orderId), enabled: apiEnabled && canAdminister && workflow === 'lab' })
  const changeShippingHold = useMutation({ mutationFn: (input: { isOnHold: boolean; reason: string }) => changeShippingJobSafetyHold(orderId, input.isOnHold, shippingHold.data!.version, input.reason), onSuccess: async () => { setShippingHoldAction(null); setShippingHoldReason(''); await Promise.all([client.invalidateQueries({ queryKey: ['shipping-job-safety-hold', orderId] }), client.invalidateQueries({ queryKey: ['platform-order', workflow, orderId] })]) } })
  const configuration = useQuery({ queryKey: [workflow === 'lab' ? 'commercial-pricing-catalog' : 'order-configuration'], queryFn: workflow === 'lab' ? getCommercialPricingCatalog : getOrderConfiguration, enabled: apiEnabled })
  const labWork = useQuery({
    queryKey: ['lab-work-by-commercial-order', orderId],
    queryFn: () => getLabWorkOrderByCommercialOrder(orderId),
    enabled: apiEnabled && canAdminister && workflow === 'lab' && Boolean(order.data && 'sampleRosterFinalizedAt' in order.data && order.data.sampleRosterFinalizedAt),
    retry: false,
  })
  async function refresh() {
    const refreshes = [
      client.invalidateQueries({ queryKey: ['platform-order', workflow, orderId] }),
      client.invalidateQueries({ queryKey: ['platform-orders', workflow] }),
      client.invalidateQueries({ queryKey: ['commercial-orders'] }),
    ]
    if (workflow === 'lab') {
      refreshes.push(client.invalidateQueries({ queryKey: ['lab-work-by-commercial-order', orderId] }))
    }
    await Promise.all(refreshes)
  }
  const mutation = useMutation({
    mutationFn: async (input: { action: string; reason?: string }) => {
      if (!order.data) throw new Error('The order has not loaded.')
      const base = workflow === 'lab' ? `lab-service-orders/${orderId}` : workflow === 'reagent' ? `reagent-orders/${orderId}` : `data-assembly-requests/${orderId}`
      return runPlatformAction(`${base}/${input.action}`, { version: order.data.version, reason: input.reason, internalNote: null })
    },
    onSuccess: async () => { setReasonDialog(null); await refresh() },
  })
  const assignment = useMutation({
    mutationFn: async (input: AssignmentInput) => {
      if (!order.data) throw new Error('The order has not loaded.')
      return updateOperationalAssignment(workflow, orderId, { version: order.data.version, ...input })
    },
    onSuccess: async () => { setAssignmentOpen(false); await refresh() },
  })
  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle><CustomerSourceText source={"Connected operations are paused"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Use a real Phaeno session."} /></AlertDescription></Alert></main>
  if (order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status"><CustomerSourceText source={"Loading operational record…"} /></p></main>
  if (order.error || !order.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Operational record could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(order.error, 'Return to the operations queue.')} />}</AlertDescription></Alert></main>
  const item = order.data
  const labItem = workflow === 'lab' && 'samples' in item ? item : null
  if (labItem?.commercialDraft) return <CommercialDraftDetails order={labItem} canEdit={Boolean(session?.capabilities.canQuoteLabServiceWork)} />
  const number = 'orderNumber' in item ? item.orderNumber : item.requestNumber
  const actions = primaryActions(workflow, item.status, 'resumeStatus' in item ? item.resumeStatus : undefined)
    .filter(action => !(labItem?.phaseScopes?.length && action.path === 'request-changes'))
    .filter(action => workflow === 'lab' && ['begin-quote', 'request-changes', 'decline'].includes(action.path) ? session?.capabilities.canQuoteLabServiceWork : canAdminister)
  const recordTitle = workflow === 'lab' && 'customerReference' in item ? item.customerReference : number
  const breadcrumb = workflow === 'lab' ? 'Order intake' : humanizeStatus(workflow)
  function renderHeaderActions(openCompletion?: () => void, completionOpen = false) {
    return <ActionMenu>
      <DropdownMenuTrigger asChild><Button ref={actionsTrigger} type="button" variant="outline"><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={event => { if (assignmentOpen || reasonDialog || completionOpen) event.preventDefault() }}>
        {openCompletion ? <DropdownMenuItem onSelect={openCompletion}><CustomerSourceText source={"Complete Job"} /></DropdownMenuItem> : null}
        {canAdminister ? <DropdownMenuItem onSelect={() => { assignment.reset(); setAssignmentOpen(true) }}><CustomerSourceText source={"Assignment"} /></DropdownMenuItem> : null}
        {canAdminister && labItem?.placedAt && shippingHold.data ? <DropdownMenuItem disabled={changeShippingHold.isPending} onSelect={() => { changeShippingHold.reset(); setShippingHoldReason(''); setShippingHoldAction(!shippingHold.data!.isOnHold) }}>{shippingHold.data.isOnHold ? <CustomerSourceText source={"Resolve shipping safety hold"} /> : <CustomerSourceText source={"Place shipping safety hold"} />}</DropdownMenuItem> : null}
        {workflow === 'lab' && labWork.data ? <DropdownMenuItem asChild><Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWork.data.id }} search={{ section: undefined }}><CustomerSourceText source={"Open Lab work"} /></Link></DropdownMenuItem> : null}
        {actions.map(action => <DropdownMenuItem key={action.path} disabled={mutation.isPending} onSelect={() => { mutation.reset(); if (action.reason) setReasonDialog(action.path); else mutation.mutate({ action: action.path }) }}>{action.label}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </ActionMenu>
  }
  return <main className="page-wrap px-4 py-8"><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-muted-foreground"><Link to={workflow === 'lab' ? '/order-operations/lab-services' : '/order-operations/partner-services'} search={previous => ({ ...previous, section: workflow === 'assembly' ? 'assembly' : workflow === 'reagent' ? 'kits' : undefined })} className="hover:underline"><CustomerSourceText source={"Order operations"} /></Link> / {breadcrumb} / <span className="font-mono">{number}</span></p><div className="mt-2 flex items-center gap-3"><PageTitle>{recordTitle}</PageTitle><OrderStatusBadge status={item.status} /></div><p className="mt-2 text-sm text-muted-foreground">{workflow === 'lab' ? <><CustomerSourceText source={"Job number"} /> <span className="font-mono">{number}</span> · </> : null}<CustomerSourceText source={"Organization"} /> {item.organizationId} · {item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned to another operator' : <CustomerSourceText source={"Unassigned"} />}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''} <CustomerSourceText source={"· Version"} /> {item.version}</p></div><div className="shrink-0">{workflow === 'lab' && 'samples' in item ? <CompleteLabJob order={item} authorized={Boolean(session?.capabilities.canOperateCommercialWork)} onSaved={refresh} renderActions={renderHeaderActions} onCloseAutoFocus={restoreActionFocus} /> : renderHeaderActions()}</div></section>{shippingHold.data?.isOnHold ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Shipping safety hold"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Further packets for this Job are blocked. Reason:"} /> {shippingHold.data.reason}<CustomerSourceText source={". Resolve the hold from Actions after review. Issued packets remain available."} /></AlertDescription></Alert> : null}{shippingHold.error && canAdminister && workflow === 'lab' ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Shipping safety status unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(shippingHold.error, 'Refresh the Job before changing its shipping safety hold.')} />}</AlertDescription></Alert> : null}{mutation.error && !reasonDialog ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Operation failed"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Reload the record and try again.')} />}</AlertDescription></Alert> : null}{configuration.error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerSourceText source={"Commercial configuration could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(configuration.error, 'Operational status changes remain available, but quote and catalog actions are paused.')} />}</AlertDescription></Alert> : null}<OperationalSummary workflow={workflow} item={item} />{workflow === 'lab' && 'samples' in item ? <><StandardLabServicePanel order={item} readOnly /><LabServiceTimingPanel orderId={item.id} timing={item.timing} phaseCount={item.phaseCount} staff={canAdminister} /></> : null}{workflow === 'reagent' && 'lines' in item ? <KitAssemblyCasesPanel order={item} staff /> : null}<CommercialControlPanel workflow={workflow} item={item} catalogItems={configuration.data?.catalogItems ?? []} labWorkOrderId={labWork.data?.id ?? null} onSaved={refresh} />{workflow !== 'lab' ? <Card className="mt-5"><CardHeader><CardTitle>{workflow === 'reagent' ? <CustomerSourceText source={"Kit fulfillment"} /> : <CustomerSourceText source={"Assembly execution"} />}</CardTitle><CardDescription>{workflow === 'reagent' ? <CustomerSourceText source={"Lab operations prepares, substitutes, ships, and completes the accepted kit order."} /> : <CustomerSourceText source={"Lab operations validates input, processes data, reviews quality, and approves outputs."} />} <CustomerSourceText source={"Commercial decisions remain in this order."} /></CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to={workflow === 'reagent' ? '/lab-operations/pseq-kit-orders/$orderId' : '/lab-operations/data-assembly/$orderId'} params={{ orderId: item.id }} search={{ section: undefined }}><CustomerSourceText source={"Open Lab work"} /></Link></Button></CardContent></Card> : null}{shippingHoldAction !== null ? <Dialog open onOpenChange={open => { if (!open && !changeShippingHold.isPending) setShippingHoldAction(null) }}><DialogContent onCloseAutoFocus={restoreActionFocus}><DialogHeader><DialogTitle>{shippingHoldAction ? <CustomerSourceText source={"Place shipping safety hold?"} /> : <CustomerSourceText source={"Resolve shipping safety hold?"} />}</DialogTitle><DialogDescription>{shippingHoldAction ? <CustomerSourceText source={"Further packets for this placed Job will be blocked until the hold is resolved. Existing issued packets remain frozen."} /> : <CustomerSourceText source={"Further packets may be issued using this Job’s pinned Sample type and Shipping procedure revisions."} />} <CustomerSourceText source={"This action is recorded in the Job audit timeline."} /></DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="shipping-hold-reason"><RequiredFieldName>{shippingHoldAction ? <CustomerSourceText source={"Safety reason"} /> : <CustomerSourceText source={"Resolution reason"} />}</RequiredFieldName></Label><textarea id="shipping-hold-reason" className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={shippingHoldReason} maxLength={2000} onChange={event => setShippingHoldReason(event.target.value)} /></div>{changeShippingHold.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Shipping safety hold was not changed"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(changeShippingHold.error, 'Refresh the Job and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={changeShippingHold.isPending} onClick={() => setShippingHoldAction(null)}><CustomerSourceText source={"Cancel"} /></Button><Button type="button" disabled={changeShippingHold.isPending || !shippingHoldReason.trim()} onClick={() => changeShippingHold.mutate({ isOnHold: shippingHoldAction, reason: shippingHoldReason.trim() })}>{changeShippingHold.isPending ? <CustomerSourceText source={"Saving…"} /> : shippingHoldAction ? 'Place hold' : 'Resolve hold'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}{reasonDialog ? <StatusReasonDialog
    actionLabel={actions.find(action => action.path === reasonDialog)?.label ?? humanizeStatus(reasonDialog)}
    onCloseAutoFocus={restoreActionFocus}
    number={number} pending={mutation.isPending} error={mutation.error}
    onClose={() => { setReasonDialog(null); mutation.reset() }}
    onSave={reason => mutation.mutate({ action: reasonDialog, reason })}
  /> : null}{assignmentOpen ? <AssignmentDialog
    onCloseAutoFocus={restoreActionFocus}
    number={number} initialDueAt={item.dueAt ?? null} hasAssignment={Boolean(item.assignedToUserId)} assignedToMe={item.assignedToUserId === userId}
    pending={assignment.isPending} error={assignment.error}
    onClose={() => { setAssignmentOpen(false); assignment.reset() }} onSave={input => assignment.mutate(input)}
  /> : null}</main>
}

const statusReasonSchema = z.object({ reason: z.string().trim().min(1, 'A reason is required.').max(2000, 'Use 2,000 characters or fewer.') })
const assignmentSchema = z.object({ dueAt: z.string().refine(value => !value || isValidLocalDateTime(value), 'Enter a valid local date and time.') })
type AssignmentInput = { assignToMe: boolean; dueAt: string | null }

function StatusReasonDialog({ actionLabel, number, pending, error, onClose, onSave, onCloseAutoFocus }: {
  onCloseAutoFocus: (event: Event) => void
  actionLabel: string; number: string; pending: boolean; error: unknown; onClose: () => void; onSave: (reason: string) => void
}) {
  const form = useForm<z.infer<typeof statusReasonSchema>>({ resolver: zodResolver(statusReasonSchema), mode: 'onBlur', defaultValues: { reason: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  useOrderDraftGuard(__formDraftDirty, pending)
  async function requestClose() { if (!pending && (!__formDraftDirty || (await confirmPortal('Discard this unsaved status-change reason?')))) onClose() }
  const reasonError = form.formState.errors.reason?.message
  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}>
    <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader><DialogTitle>{actionLabel} <CustomerSourceText source={"for"} /> {number}</DialogTitle><DialogDescription><CustomerSourceText source={"Explain the change for the Customer or Partner. Keep internal scientific and commercial notes in Internal context."} /></DialogDescription></DialogHeader>
      {error ? <DialogFeedback><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Status change was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Try again. Your reason is retained.')} />}</AlertDescription></Alert></DialogFeedback> : null}
      <form id="operational-status-change" noValidate onSubmit={form.handleSubmit(values => onSave(values.reason))}>
        <fieldset disabled={pending} className="space-y-1.5">
          <Label htmlFor="operationReason"><RequiredFieldName><CustomerSourceText source={"Reason shared with the requester"} /></RequiredFieldName></Label>
          <textarea id="operationReason" required maxLength={2000} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? 'operationReason-error' : undefined} {...form.register('reason')} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" />
          {reasonError ? <FieldError id="operationReason-error">{reasonError}</FieldError> : null}
        </fieldset>
      </form>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={requestClose}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="operational-status-change" disabled={pending}>{pending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Apply status change"} />}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function AssignmentDialog({ number, initialDueAt, hasAssignment, assignedToMe, pending, error, onClose, onSave, onCloseAutoFocus }: {
  onCloseAutoFocus: (event: Event) => void
  number: string; initialDueAt: string | null; hasAssignment: boolean; assignedToMe: boolean; pending: boolean; error: unknown; onClose: () => void; onSave: (input: AssignmentInput) => void
}) {
  const form = useForm<z.infer<typeof assignmentSchema>>({ resolver: zodResolver(assignmentSchema), mode: 'onBlur', defaultValues: { dueAt: toLocalDateTime(initialDueAt) } })
  const { isDirty: __formDraftDirty } = form.formState

  useOrderDraftGuard(__formDraftDirty, pending)
  async function requestClose() { if (!pending && (!__formDraftDirty || (await confirmPortal('Discard these unsaved assignment changes?')))) onClose() }
  const dueAtError = form.formState.errors.dueAt?.message
  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}>
    <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader><DialogTitle><CustomerSourceText source={"Assignment for"} /> {number}</DialogTitle><DialogDescription><CustomerSourceText source={"Take responsibility for this order and optionally set when it is due. Clearing the assignment also removes its due time."} /></DialogDescription></DialogHeader>
      {error ? <DialogFeedback><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Assignment was not saved"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Try again. Your entered date and time are retained.')} />}</AlertDescription></Alert></DialogFeedback> : null}
      <form id="operational-assignment" noValidate onSubmit={event => {
        const input = event.currentTarget.elements.namedItem('dueAt')
        if (input instanceof HTMLInputElement && input.validity.badInput) {
          event.preventDefault()
          form.setError('dueAt', { message: 'Enter a valid local date and time.' }, { shouldFocus: true })
          return
        }
        void form.handleSubmit(values => onSave({ assignToMe: true, dueAt: !form.formState.dirtyFields.dueAt ? initialDueAt : values.dueAt ? new Date(values.dueAt).toISOString() : null }))(event)
      }}>
        <fieldset disabled={pending} className="space-y-1.5">
          <Label htmlFor="assignmentDueAt"><CustomerSourceText source={"Due at (optional)"} /></Label>
          <Input id="assignmentDueAt" type="datetime-local" aria-invalid={Boolean(dueAtError)} aria-describedby={dueAtError ? 'assignmentDueAt-help assignmentDueAt-error' : 'assignmentDueAt-help'} {...form.register('dueAt')} />
          <p id="assignmentDueAt-help" className="text-xs text-muted-foreground"><CustomerSourceText source={"Use your local date and time."} /></p>
          {dueAtError ? <FieldError id="assignmentDueAt-error">{dueAtError}</FieldError> : null}
        </fieldset>
      </form>
      <DialogFooter>{hasAssignment ? <Button type="button" variant="outline" disabled={pending} onClick={() => onSave({ assignToMe: false, dueAt: null })}><CustomerSourceText source={"Clear assignment"} /></Button> : null}<Button type="button" variant="outline" disabled={pending} onClick={requestClose}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="operational-assignment" disabled={pending}>{pending ? <CustomerSourceText source={"Saving…"} /> : assignedToMe ? 'Update my assignment' : 'Assign to me'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isValidLocalDateTime(value: string) {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false
  return toLocalDateTime(value) === value
}

function OperationalSummary({ workflow, item }: { workflow: Workflow; item: LabServiceOrder | ReagentOrder | DataAssemblyRequest }) {
  const internalNote = item.internalNote
  const timeline = item.timeline
  const quote = 'quotes' in item ? latestQuote(item.quotes) : undefined
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{workflow === 'lab' ? <CustomerSourceText source={"Commercial scope"} /> : <CustomerSourceText source={"Operational facts"} />}</CardTitle>
          <CardDescription>
            {workflow === 'lab'
              ? <CustomerSourceText source={"The priced Customer scope remains separate from specimen receipt, accessioning, and laboratory execution."} />
              : <CustomerSourceText source={"Tenant-visible and internal evidence remain separated."} />}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflow === 'lab' && 'sourceGroups' in item ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-bold"><CustomerSourceText source={"Requested specimens"} /></dt><dd className="mt-1 text-muted-foreground">{item.requestedSpecimenCount}</dd></div>
              <div><dt className="font-bold"><CustomerSourceText source={"Biological sources"} /></dt><dd className="mt-1 text-muted-foreground">{item.sourceGroups.map((group) => `${group.biologicalSource} (${group.specimenCount})`).join(', ')}</dd></div>
              <div><dt className="font-bold"><CustomerSourceText source={"Storage requirements"} /></dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.storageRequirements}</dd></div>
              <div><dt className="font-bold"><CustomerSourceText source={"Safety declaration"} /></dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.safetyDeclaration}</dd></div>
              <div>
                <dt className="font-bold"><CustomerSourceText source={"Proposed price"} /></dt>
                <dd className="mt-1 text-muted-foreground">
                  {item.phaseScopes?.length
                    ? item.phaseScopes.some(phase => phase.proposedUnitPrice != null) ? 'Proposed prices are shown by phase below.' : 'No price proposed'
                    : item.proposedUnitPrice != null
                    ? `${formatMoney(item.proposedUnitPrice, item.proposedCurrency ?? 'USD')} per sample · ${formatMoney(item.proposedUnitPrice * item.requestedSpecimenCount, item.proposedCurrency ?? 'USD')} proposed subtotal`
                    : 'No price proposed'}
                </dd>
              </div>
              {quote ? (
                <div>
                  <dt className="font-bold"><CustomerSourceText source={"Current quote"} /></dt>
                  <dd className="mt-1">
                    <span className="font-semibold text-foreground">{formatMoney(quote.total, quote.currency)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {quote.tax === 0 ? <CustomerSourceText source={"Pre-tax total"} /> : `${formatMoney(quote.subtotal, quote.currency)} pre-tax`} <CustomerSourceText source={"· Revision"} /> {quote.revision} · {humanizeStatus(quote.status)}
                    </span>
                  </dd>
                </div>
              ) : null}
              {item.priceProposalNote ? <div><dt className="font-bold"><CustomerSourceText source={"Proposal note"} /></dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.priceProposalNote}</dd></div> : null}
            </dl>
          ) : null}
          {workflow === 'reagent' && 'lines' in item ? <ul className="divide-y">{item.lines.map((line) => <li key={line.id} className="flex justify-between gap-3 py-3"><span>{line.description} · {line.remainingQuantity} <CustomerSourceText source={"remaining"} /></span><span>{line.currency} {line.lineTotal.toFixed(2)}</span></li>)}</ul> : null}
          {workflow === 'assembly' && 'inputFiles' in item ? <div><p className="text-sm">{item.profileName} v{item.assemblyProfileVersion}</p><p className="mt-2 text-sm text-muted-foreground">{item.inputFiles.length} <CustomerSourceText source={"input file(s) ·"} /> {item.processingRuns.length} <CustomerSourceText source={"processing run(s) ·"} /> {item.outputReleases.length} <CustomerSourceText source={"output release(s)"} /></p></div> : null}
        </CardContent>
      </Card>
      <div className="space-y-5">
        {item.tenantSafeReason ? <Alert><AlertTitle><CustomerSourceText source={"Tenant-safe reason"} /></AlertTitle><AlertDescription>{item.tenantSafeReason}</AlertDescription></Alert> : null}
        {internalNote ? <Alert><AlertTitle><CustomerSourceText source={"Internal context"} /></AlertTitle><AlertDescription>{internalNote}</AlertDescription></Alert> : null}
        <Card><CardHeader><CardTitle><CustomerSourceText source={"Audit timeline"} /></CardTitle></CardHeader><CardContent><ol className="space-y-3">{timeline.slice().reverse().map((entry) => <li key={entry.id} className="border-l-2 pl-3 text-sm"><strong>{quoteDecisionHistoryLabel(entry, 'quotes' in item ? item.quotes : [])}</strong><span className="block text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</span>{entry.reason ? <p className="mt-1 whitespace-pre-wrap wrap-anywhere">{entry.reason}</p> : null}{entry.internalNote ? <span className="mt-1 block text-muted-foreground"><span className="font-medium text-foreground"><CustomerSourceText source={"Internal context:"} /></span> {entry.internalNote}</span> : null}</li>)}</ol></CardContent></Card>
      </div>
    </div>
  )
}

export function CommercialControlPanel({
  workflow,
  item,
  catalogItems,
  labWorkOrderId,
  onSaved,
}: {
  workflow: Workflow
  item: LabServiceOrder | ReagentOrder | DataAssemblyRequest
  catalogItems: Awaited<ReturnType<typeof getOrderConfiguration>>['catalogItems']
  labWorkOrderId: string | null
  onSaved: () => Promise<void>
}) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteOpening, setQuoteOpening] = useState(false)
  const [quoteOpeningError, setQuoteOpeningError] = useState<string | null>(null)
  const commercialActionRef = useRef<HTMLButtonElement>(null)
  const { session } = usePhaenoSession()
  const canOperate = Boolean(session?.capabilities?.canOperateCommercialWork)
  const labOrder = workflow === 'lab' && 'quotes' in item && 'requestedSpecimenCount' in item ? item : null
  const issuedQuote = labOrder && ['QuoteIssued', 'QuoteInPreparation'].includes(item.status)
    ? latestQuote(labOrder.quotes.filter(quote => quote.purpose === 'Initial' && (quote.status === 'Issued' || quote.status === 'Expired')))
    : undefined
  const extensionRequest = issuedQuote?.extensionRequest?.status === 'Pending' ? issuedQuote.extensionRequest : null
  const proposal = labOrder?.quoteChangeProposal
  const mayQuote = canOperate && (labOrder
    ? labOrder.canManageQuotes && ['QuoteInPreparation', 'QuoteIssued'].includes(item.status)
    : workflow === 'assembly' && !('isIncludedAssembly' in item && item.isIncludedAssembly) && item.status === 'QuoteInPreparation')
  const workflowPath = workflow === 'lab' ? 'lab-service-orders' : workflow === 'reagent' ? 'reagent-orders' : 'data-assembly-requests'
  async function openQuote() {
    setQuoteOpening(true)
    setQuoteOpeningError(null)
    try {
      await onSaved()
      setQuoteOpen(true)
    } catch (error) {
      setQuoteOpeningError(getOrderErrorMessage(error, 'Refresh the Job and try again.'))
    } finally {
      setQuoteOpening(false)
    }
  }
  function renderCommercialActions(openChangeQuote?: () => void) {
    return <ActionMenu><DropdownMenuTrigger asChild><Button ref={commercialActionRef}><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)] [&_[data-slot=dropdown-menu-item]]:whitespace-nowrap">
      {openChangeQuote ? <DropdownMenuItem onSelect={openChangeQuote}><CustomerSourceText source={"Issue Change quote"} /></DropdownMenuItem> : null}
      {mayQuote ? <DropdownMenuItem disabled={quoteOpening} onSelect={() => void openQuote()}>{quoteOpening ? <CustomerSourceText source={"Refreshing…"} /> : proposal ? 'Review proposal and revise quote' : extensionRequest ? 'Review extension' : issuedQuote ? 'Reissue quote' : workflow === 'lab' && 'proposedUnitPrice' in item && item.proposedUnitPrice != null ? 'Review and issue quote' : 'Issue quote'}</DropdownMenuItem> : null}
      {workflow === 'lab' && labWorkOrderId ? <DropdownMenuItem asChild><Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWorkOrderId }} search={{ section: undefined }}><CustomerSourceText source={"Open Lab work"} /></Link></DropdownMenuItem> : null}
    </DropdownMenuContent></ActionMenu>
  }
  return (
    <div className="mt-5 space-y-5">
      {labOrder ? <LabPhasesPanel order={labOrder} internal onSaved={onSaved} /> : null}
      {labOrder && (labOrder.privateNotes || labOrder.publicNotes) ? <Card><CardHeader><CardTitle>Order notes</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div><h3 className="mb-2 text-sm font-bold">Private notes · Phaeno only</h3>{labOrder.privateNotes ? <OrderRichText value={labOrder.privateNotes} /> : <p className="text-sm text-muted-foreground">Not entered</p>}</div>
        <div><h3 className="mb-2 text-sm font-bold">Public notes · visible to the customer</h3>{labOrder.publicNotes ? <OrderRichText value={labOrder.publicNotes} /> : <p className="text-sm text-muted-foreground">Not entered</p>}</div>
      </CardContent></Card> : null}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle><CustomerSourceText source={"Commercial control"} /></CardTitle>
              <CardDescription>
                {workflow === 'lab'
                  ? <CustomerSourceText source={"Pricing, quotes, Customer decisions, and the immutable order remain in Order intake. Receipt, accessioning, and execution are performed in Lab operations."} />
                  : <CustomerSourceText source={"Commercial approval and the immutable order remain here."} />}
              </CardDescription>
            </div>
            <div className="shrink-0">
              {canOperate && labOrder?.canManageQuotes && labOrder.canProposeChange ? <IssueLabChangeQuote order={labOrder} catalogItems={catalogItems} onSaved={onSaved} renderTrigger={renderCommercialActions} onCloseFocus={() => commercialActionRef.current?.focus()} /> : renderCommercialActions()}
            </div>
          </div>
        </CardHeader>
        {quoteOpeningError ? <CardContent><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Quote could not be opened"} /></AlertTitle><AlertDescription>{quoteOpeningError}</AlertDescription></Alert></CardContent> : null}
        {workflow === 'lab' ? (
          <CardContent>
            {proposal ? <Alert className="mb-4"><AlertTitle><CustomerSourceText source={"Customer proposed changes"} /></AlertTitle><AlertDescription><p><CustomerSourceText source={"Quote revision"} /> {proposal.quoteRevision} <CustomerSourceText source={"· Sent"} /> {formatDateTime(proposal.proposedAt)}</p><p className="whitespace-pre-wrap break-words">{proposal.reason}</p><p>{mayQuote ? <CustomerSourceText source={"Review the proposal and issue a revised quote. Ask the Customer to correct the request first if scope needs to change. Quote acceptance is paused during this review."} /> : <CustomerSourceText source={"An authorized Commercial Operator must review this proposal."} />}</p></AlertDescription></Alert> : null}
            {extensionRequest ? <Alert className="mb-4"><AlertTitle><CustomerSourceText source={"Quote extension requested"} /></AlertTitle><AlertDescription><p><CustomerSourceText source={"Revision"} /> {issuedQuote?.revision} <CustomerSourceText source={"· Requested"} /> {formatDateTime(extensionRequest.requestedAt)}</p>{extensionRequest.reason ? <p className="whitespace-pre-wrap break-words">{extensionRequest.reason}</p> : null}<p>{mayQuote ? <CustomerSourceText source={"Review the request and issue a new quote revision with a future expiration date. The request closes when that revision is issued."} /> : <CustomerSourceText source={"An authorized Commercial Operator must review this request."} />}</p></AlertDescription></Alert> : null}
            <p className="text-sm text-muted-foreground">
              {labWorkOrderId
                ? <CustomerSourceText source={"The commercial order remains the source record; Lab operations owns all authorized physical and scientific work."} />
                : <CustomerSourceText source={"Lab work is created only after quote acceptance and finalization of the exact sample roster."} />}
            </p>
          </CardContent>
        ) : null}
      </Card>
      {session?.capabilities.canManageOrderConfiguration ? <CancellationDecisionPanel
        workflowPath={workflowPath}
        recordId={item.id}
        version={item.version}
        requests={item.cancellationRequests}
        reagentLines={workflow === 'reagent' && 'lines' in item ? item.lines : undefined}
        labSamples={workflow === 'lab' && 'samples' in item ? item.samples : undefined}
        onSaved={onSaved}
      /> : null}
      {workflow === 'lab' ? <PhaseQuoteDialog open={quoteOpen} order={item as LabServiceOrder} sourceQuote={issuedQuote} catalogItems={catalogItems} onOpenChange={setQuoteOpen} onSaved={onSaved} /> : workflow === 'assembly' ? (
        <PlatformQuoteDialog
          open={quoteOpen}
          workflow={workflow}
          recordId={item.id}
          sourceQuote={issuedQuote}
          catalogItems={catalogItems}
          onOpenChange={setQuoteOpen}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  )
}

export function primaryActions(workflow: Workflow, status: string, resumeStatus?: string | null) {
  if (workflow === 'lab') {
    if (status === 'SubmittedForQuote') return [{ label: 'Begin quote', path: 'begin-quote', reason: false }, { label: 'Request changes', path: 'request-changes', reason: true }]
    if (status === 'QuoteInPreparation') return [{ label: 'Request changes', path: 'request-changes', reason: true }, { label: 'Decline request', path: 'decline', reason: true }]
    if (status === 'OnHold') return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (!['Completed', 'Cancelled', 'Declined'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  if (workflow === 'reagent') {
    if (status === 'UnderReview') return [{ label: 'Accept order', path: 'accept', reason: false }, { label: 'Reject', path: 'reject', reason: true }]
    if (status === 'OnHold' && ['Placed', 'UnderReview'].includes(resumeStatus ?? '')) return [{ label: 'Release commercial hold', path: 'release-hold', reason: true }]
    if (status === 'Placed') return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  if (workflow === 'assembly') {
    if (status === 'IntakeValidation') return [{ label: 'Request Customer changes', path: 'request-changes', reason: true }, { label: 'Reject request', path: 'reject', reason: true }]
    if (status === 'OnHold' && ['ChangesRequested', 'QuoteInPreparation', 'QuoteIssued'].includes(resumeStatus ?? '')) return [{ label: 'Release commercial hold', path: 'release-hold', reason: true }]
    if (['ChangesRequested', 'QuoteInPreparation', 'QuoteIssued'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  return []
}

function formatDateTime(value: string) { return formatDisplayTimestamp(value) }
function formatMoney(value: number, currency: string) { return formatDisplayCurrency(value, currency) }
function latestQuote(quotes: Quote[]) { return quotes.reduce<Quote | undefined>((latest, quote) => !latest || quote.revision > latest.revision ? quote : latest, undefined) }
function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined
  date.setUTCDate(date.getUTCDate() + 1)
  return date.getUTCFullYear() <= 9999 ? date.toISOString() : undefined
}

const workflowStatuses: Record<Workflow, string[]> = {
  lab: ['DraftRequest', 'SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Declined'],
  reagent: ['Draft', 'Placed', 'UnderReview', 'Accepted', 'Processing', 'PartiallyShipped', 'Shipped', 'OnHold', 'CancellationRequested', 'Fulfilled', 'Cancelled', 'Rejected'],
  assembly: ['Draft', 'Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedQueued', 'Processing', 'OutputReview', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Rejected'],
}
