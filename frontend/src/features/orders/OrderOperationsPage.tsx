import { LabServiceTimingPanel } from './LabServiceTimingPanel'
import { StandardLabServicePanel } from './StandardLabServicePanel'
import { KitAssemblyCasesPanel } from './KitAssemblyCasesPanel'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getOrderConfiguration, getOrderErrorMessage, getPlatformOrder, listIntegrationMessages, listNotificationMessages, listPlatformOrders, retryIntegrationMessage, retryNotificationMessage, runPlatformAction, updateOperationalAssignment, type DataAssemblyRequest, type IntegrationMessage, type LabServiceOrder, type NotificationMessage, type PagedResult, type Quote, type ReagentOrder } from '#/api/order-management'
import type { SessionCapabilities } from '#/api/session'
import { listOrganizations } from '#/api/data-provisioning'
import { getLabWorkOrderByCommercialOrder } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { OrderOperationsSidebar } from './OrderOperationsSidebar'
import { CommercialSaleSummaryAttention } from './CommercialSaleSummaryAttention'
import { getOrderSections, type OrderSection } from './order-sections'
import { Button } from '#/components/ui/button'
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
import { PlatformQuoteDialog } from './operations/PlatformQuoteDialog'
import { ResultReleasePanel } from './ResultReleasePanel'
import { FinanceOperationsPanel, OperationalAttentionPanel } from './PSeqOrderToCashPanels'

type Workflow = 'lab' | 'reagent' | 'assembly'
export function OrderOperationsPage({ workflow, orderId, initialSection }: { workflow?: Workflow; orderId?: string; initialSection?: OrderSection }) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const capabilities = session?.capabilities
  const canView = Boolean(
    capabilities?.canViewAllOperationalOrders ||
      capabilities?.canOperateCommercialWork ||
      capabilities?.canReleasePSeqResults ||
      capabilities?.canManagePSeqBilling ||
      capabilities?.canManagePSeqCash ||
      capabilities?.canReconcilePSeqCash ||
      (getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno' && capabilities?.canViewTrialProjects),
  )
  const apiEnabled = canView && authProvider !== 'mock'
  if (!canView) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order operations unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  if (workflow && orderId) return <OperationalDetail workflow={workflow} orderId={orderId} apiEnabled={apiEnabled && Boolean(capabilities?.canViewAllOperationalOrders)} userId={session?.user?.id ?? null} />
  return <OperationalQueues key={initialSection} initialSection={initialSection} apiEnabled={apiEnabled} mock={authProvider === 'mock'} userId={session?.user?.id ?? null} capabilities={capabilities!} />
}

function OperationalQueues({ apiEnabled, mock, userId, capabilities, initialSection }: { initialSection?: OrderSection; apiEnabled: boolean; mock: boolean; userId: string | null; capabilities: SessionCapabilities }) {
  const availableSections = getOrderSections(capabilities)
  const navigate = useNavigate()
  const section = availableSections.find(item => item.value === initialSection)?.value ?? availableSections[0]?.value ?? 'attention'
  const setSection = (value: OrderSection) => { void navigate({ to: '/order-operations', search: previous => ({ ...previous, orderSection: value }) }) }
  const organizations = useQuery({ queryKey: ['order-operations', 'organizations'], queryFn: listOrganizations, enabled: apiEnabled && capabilities.canViewAllOperationalOrders })
  const integrations = useQuery({ queryKey: ['order-integrations'], queryFn: () => listIntegrationMessages(), enabled: apiEnabled && capabilities.canViewAllOperationalOrders })
  const notifications = useQuery({ queryKey: ['order-notifications'], queryFn: () => listNotificationMessages(), enabled: apiEnabled && capabilities.canViewAllOperationalOrders })
  const organizationOptions = organizations.data?.map((item) => ({ id: item.id, name: item.name, kind: item.kind })) ?? []
  if (section === 'trials') return <Navigate to="/trial-projects" replace />
  return (
    <main className="py-8">
      <OrderOperationsSidebar section={section} onSectionChange={setSection}>
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            <h1 className="text-3xl font-semibold">Order operations</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Commercial intake, pricing, Customer decisions, governed result release,
              accounts receivable, holds, and exception recovery.
            </p>
          </section>
          {mock ? (
            <Alert className="mb-5">
              <AlertTitle>Connected queues are paused in mock-session mode</AlertTitle>
              <AlertDescription>Use a real Phaeno session to work operational orders.</AlertDescription>
            </Alert>
          ) : null}
          {section === 'intake' ? <CommercialOrderIntakePanel apiEnabled={apiEnabled} mock={mock} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'reagent' ? <QueueCard title="PSeq kit queue" workflow="reagent" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'assembly' ? <QueueCard title="Assembly queue" workflow="assembly" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'attention' ? <><OperationalAttentionPanel apiEnabled={apiEnabled} userId={userId} /><CommercialSaleSummaryAttention enabled={apiEnabled && capabilities.canManageOrderConfiguration} /></> : null}
          {section === 'results' ? <ResultReleasePanel apiEnabled={apiEnabled} /> : null}
          {section === 'finance' ? <FinanceOperationsPanel apiEnabled={apiEnabled} canBill={capabilities.canManagePSeqBilling} canManageCash={capabilities.canManagePSeqCash} canReconcile={capabilities.canReconcilePSeqCash} /> : null}
          {section === 'integrations' ? <IntegrationQueue query={integrations} notifications={notifications} apiEnabled={apiEnabled} /> : null}
        </div>
      </OrderOperationsSidebar>
    </main>
  )
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
  const setFilter = (patch: { queueSearch?: string; queueOrganization?: string; queueStatus?: string; queueView?: typeof view; queueFrom?: string; queueTo?: string; queuePage?: number }) => { void navigate({ to: '/order-operations', search: previous => ({ ...previous, orderSection: workflow === 'assembly' ? 'assembly' : 'reagent', queuePage: 1, ...patch }), replace: true }) }
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
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Newest activity first. Filter actionable work, then open a record to assign and operate it.</CardDescription><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div><Label htmlFor={`${workflow}-queue-search`}>Search</Label><Input id={`${workflow}-queue-search`} className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><Label htmlFor={`${workflow}-queue-organization`}>Organization</Label><select id={`${workflow}-queue-organization`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">All organizations</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><Label htmlFor={`${workflow}-queue-status`}>Status</Label><select id={`${workflow}-queue-status`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{workflowStatuses[workflow].map((item) => <option key={item} value={item}>{humanizeStatus(item)}</option>)}</select></div><div><Label htmlFor={`${workflow}-queue-view`}>Queue view</Label><select id={`${workflow}-queue-view`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={view} onChange={(event) => setView(event.target.value as typeof view)}><option value="all">All work</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option><option value="overdue">Overdue</option><option value="holds">On hold</option></select></div><div><Label htmlFor={`${workflow}-queue-from`}>Updated from</Label><Input id={`${workflow}-queue-from`} type="date" className="mt-2" value={updatedFrom} onChange={(event) => setUpdatedFrom(event.target.value)} /></div><div><Label htmlFor={`${workflow}-queue-to`}>Updated through</Label><Input id={`${workflow}-queue-to`} type="date" className="mt-2" value={updatedTo} onChange={(event) => setUpdatedTo(event.target.value)} /></div></div></CardHeader><CardContent>{query.error ? <Alert variant="destructive"><AlertTitle>Queue could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status">Loading queue…</p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link to="/order-operations/$workflow/$orderId" params={{ workflow, orderId: item.id }} search={previous => previous} className="font-medium text-primary hover:underline">{item.number}</Link><p className="mt-1 text-xs text-muted-foreground">{organizations.find((org) => org.id === item.organizationId)?.name ?? item.organizationId} · {item.reference ?? 'No reference'}</p><p className="mt-1 text-xs text-muted-foreground">{item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned' : 'Unassigned'}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''}</p></div><div className="flex items-center gap-2">{item.isOverdue ? <span className="text-xs font-medium text-destructive">Overdue</span> : null}<OrderStatusBadge status={item.status} /></div></div>)}</div>{!query.isLoading && !query.isError && !query.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">No records in this queue.</p> : null}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => setFilter({ queueSearch: '', queueOrganization: '', queueStatus: '', queueView: 'all', queueFrom: '', queueTo: '', queuePage: 1 })}>Clear filters</Button>{query.data ? <><p className="text-sm text-muted-foreground">{query.data.totalCount} records · Page {page} of {Math.max(1, Math.ceil(query.data.totalCount / 25))}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setFilter({ queuePage: page - 1 })}>Previous</Button><Button variant="outline" disabled={page * 25 >= query.data.totalCount || query.isFetching} onClick={() => setFilter({ queuePage: page + 1 })}>Next</Button></div></> : null}</div></CardContent></Card>
}

function IntegrationQueue({ query, notifications, apiEnabled }: { query: UseQueryResult<PagedResult<IntegrationMessage>, Error>; notifications: UseQueryResult<PagedResult<NotificationMessage>, Error>; apiEnabled: boolean }) {
  const client = useQueryClient()
  const retry = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryIntegrationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-integrations'] }) })
  const retryNotification = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryNotificationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-notifications'] }) })
  return <div className="space-y-5"><Card><CardHeader><CardTitle>Legacy accounting connector queue</CardTitle><CardDescription>POMS accounts receivable is the active PSeq workflow. This queue remains only for historical connector recovery and non-PSeq records.</CardDescription></CardHeader><CardContent>{query.error ? <Alert variant="destructive"><AlertTitle>Integration queue unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status">Loading integration messages…</p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{humanizeStatus(item.operation)} · {item.workflowType}</p><p className="mt-1 text-xs text-muted-foreground">Attempts {item.attemptCount} · Next {formatDateTime(item.nextAttemptAt)}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' || item.status === 'NeedsAttention' ? <Button type="button" variant="outline" disabled={!apiEnabled || retry.isPending} onClick={() => retry.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" />Retry</Button> : null}</div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Notification delivery queue</CardTitle><CardDescription>Failed transactional email remains visible and can be retried after delivery configuration is corrected.</CardDescription></CardHeader><CardContent>{notifications.error ? <Alert variant="destructive"><AlertTitle>Notification queue unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(notifications.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{notifications.isLoading ? <p role="status">Loading notification messages…</p> : null}<div className="divide-y">{notifications.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">{item.workflowType} · {humanizeStatus(item.eventType)} · Attempts {item.attemptCount}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' ? <Button type="button" variant="outline" disabled={!apiEnabled || retryNotification.isPending} onClick={() => retryNotification.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" />Retry</Button> : null}</div></div>)}</div></CardContent></Card></div>
}

function OperationalDetail({ workflow, orderId, apiEnabled, userId }: { workflow: Workflow; orderId: string; apiEnabled: boolean; userId: string | null }) {
  const client = useQueryClient()
  const [reasonDialog, setReasonDialog] = useState<string | null>(null)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const order = useQuery({ queryKey: ['platform-order', workflow, orderId], queryFn: () => getPlatformOrder(workflow, orderId), enabled: apiEnabled })
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  const labWork = useQuery({
    queryKey: ['lab-work-by-commercial-order', orderId],
    queryFn: () => getLabWorkOrderByCommercialOrder(orderId),
    enabled: apiEnabled && workflow === 'lab' && Boolean(order.data && 'sampleRosterFinalizedAt' in order.data && order.data.sampleRosterFinalizedAt),
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
  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected operations are paused</AlertTitle><AlertDescription>Use a real Phaeno session.</AlertDescription></Alert></main>
  if (order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading operational record…</p></main>
  if (order.error || !order.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Operational record could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(order.error, 'Return to the operations queue.')}</AlertDescription></Alert></main>
  const item = order.data
  const number = 'orderNumber' in item ? item.orderNumber : item.requestNumber
  const actions = primaryActions(workflow, item.status, 'resumeStatus' in item ? item.resumeStatus : undefined)
  const recordTitle = workflow === 'lab' && 'customerReference' in item ? item.customerReference : number
  const breadcrumb = workflow === 'lab' ? 'Order intake' : humanizeStatus(workflow)
  return <main className="page-wrap px-4 py-8"><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-muted-foreground"><Link to="/order-operations" search={previous => ({ ...previous, orderSection: previous.orderSection ?? (workflow === 'lab' ? 'intake' : workflow) })} className="hover:underline">Order operations</Link> / {breadcrumb} / <span className="font-mono">{number}</span></p><div className="mt-2 flex items-center gap-3"><h1 className="text-3xl font-semibold">{recordTitle}</h1><OrderStatusBadge status={item.status} /></div><p className="mt-2 text-sm text-muted-foreground">{workflow === 'lab' ? <>Job number <span className="font-mono">{number}</span> · </> : null}Organization {item.organizationId} · {item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned to another operator' : 'Unassigned'}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''} · Version {item.version}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { assignment.reset(); setAssignmentOpen(true) }}>Assignment</Button>{workflow === 'lab' && labWork.data ? <Button asChild variant="outline"><Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWork.data.id }} search={{ section: undefined }}>Open Lab work</Link></Button> : null}{actions.map((action) => <Button key={action.path} type="button" variant={action.reason ? 'outline' : 'default'} disabled={mutation.isPending} onClick={() => { mutation.reset(); if (action.reason) setReasonDialog(action.path); else mutation.mutate({ action: action.path }) }}>{action.label}</Button>)}</div></section>{mutation.error && !reasonDialog ? <Alert variant="destructive" className="mb-5"><AlertTitle>Operation failed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Reload the record and try again.')}</AlertDescription></Alert> : null}{configuration.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Commercial configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Operational status changes remain available, but quote and catalog actions are paused.')}</AlertDescription></Alert> : null}<OperationalSummary workflow={workflow} item={item} />{workflow === 'lab' && 'samples' in item ? <><StandardLabServicePanel order={item} readOnly /><LabServiceTimingPanel orderId={item.id} timing={item.timing} staff /></> : null}{workflow === 'reagent' && 'lines' in item ? <KitAssemblyCasesPanel order={item} staff /> : null}<CommercialControlPanel workflow={workflow} item={item} catalogItems={configuration.data?.catalogItems ?? []} labWorkOrderId={labWork.data?.id ?? null} onSaved={refresh} />{workflow !== 'lab' ? <Card className="mt-5"><CardHeader><CardTitle>{workflow === 'reagent' ? 'Kit fulfillment' : 'Assembly execution'}</CardTitle><CardDescription>{workflow === 'reagent' ? 'Lab operations prepares, substitutes, ships, and completes the accepted kit order.' : 'Lab operations validates input, processes data, reviews quality, and approves outputs.'} Commercial decisions remain in this order.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to={workflow === 'reagent' ? '/lab-operations/pseq-kit-orders/$orderId' : '/lab-operations/data-assembly/$orderId'} params={{ orderId: item.id }} search={{ section: undefined }}>Open Lab work</Link></Button></CardContent></Card> : null}{reasonDialog ? <StatusReasonDialog
    actionLabel={actions.find(action => action.path === reasonDialog)?.label ?? humanizeStatus(reasonDialog)}
    number={number} pending={mutation.isPending} error={mutation.error}
    onClose={() => { setReasonDialog(null); mutation.reset() }}
    onSave={reason => mutation.mutate({ action: reasonDialog, reason })}
  /> : null}{assignmentOpen ? <AssignmentDialog
    number={number} initialDueAt={item.dueAt ?? null} hasAssignment={Boolean(item.assignedToUserId)} assignedToMe={item.assignedToUserId === userId}
    pending={assignment.isPending} error={assignment.error}
    onClose={() => { setAssignmentOpen(false); assignment.reset() }} onSave={input => assignment.mutate(input)}
  /> : null}</main>
}

const statusReasonSchema = z.object({ reason: z.string().trim().min(1, 'A reason is required.').max(2000, 'Use 2,000 characters or fewer.') })
const assignmentSchema = z.object({ dueAt: z.string().refine(value => !value || isValidLocalDateTime(value), 'Enter a valid local date and time.') })
type AssignmentInput = { assignToMe: boolean; dueAt: string | null }

function StatusReasonDialog({ actionLabel, number, pending, error, onClose, onSave }: {
  actionLabel: string; number: string; pending: boolean; error: unknown; onClose: () => void; onSave: (reason: string) => void
}) {
  const form = useForm<z.infer<typeof statusReasonSchema>>({ resolver: zodResolver(statusReasonSchema), mode: 'onBlur', defaultValues: { reason: '' } })
  useOrderDraftGuard(form.formState.isDirty, pending)
  function requestClose() { if (!pending && (!form.formState.isDirty || window.confirm('Discard this unsaved status-change reason?'))) onClose() }
  const reasonError = form.formState.errors.reason?.message
  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{actionLabel} for {number}</DialogTitle><DialogDescription>Explain the change for the Customer or Partner. Keep internal scientific and commercial notes in Internal context.</DialogDescription></DialogHeader>
      {error ? <DialogFeedback><Alert variant="destructive"><AlertTitle>Status change was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again. Your reason is retained.')}</AlertDescription></Alert></DialogFeedback> : null}
      <form id="operational-status-change" noValidate onSubmit={form.handleSubmit(values => onSave(values.reason))}>
        <fieldset disabled={pending} className="space-y-1.5">
          <Label htmlFor="operationReason"><RequiredFieldName>Reason shared with the requester</RequiredFieldName></Label>
          <textarea id="operationReason" required maxLength={2000} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? 'operationReason-error' : undefined} {...form.register('reason')} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" />
          {reasonError ? <FieldError id="operationReason-error">{reasonError}</FieldError> : null}
        </fieldset>
      </form>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={pending} onClick={requestClose}>Cancel</Button><Button type="submit" form="operational-status-change" disabled={pending}>{pending ? 'Saving…' : 'Apply status change'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function AssignmentDialog({ number, initialDueAt, hasAssignment, assignedToMe, pending, error, onClose, onSave }: {
  number: string; initialDueAt: string | null; hasAssignment: boolean; assignedToMe: boolean; pending: boolean; error: unknown; onClose: () => void; onSave: (input: AssignmentInput) => void
}) {
  const form = useForm<z.infer<typeof assignmentSchema>>({ resolver: zodResolver(assignmentSchema), mode: 'onBlur', defaultValues: { dueAt: toLocalDateTime(initialDueAt) } })
  useOrderDraftGuard(form.formState.isDirty, pending)
  function requestClose() { if (!pending && (!form.formState.isDirty || window.confirm('Discard these unsaved assignment changes?'))) onClose() }
  const dueAtError = form.formState.errors.dueAt?.message
  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Assignment for {number}</DialogTitle><DialogDescription>Take responsibility for this order and optionally set when it is due. Clearing the assignment also removes its due time.</DialogDescription></DialogHeader>
      {error ? <DialogFeedback><Alert variant="destructive"><AlertTitle>Assignment was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again. Your entered date and time are retained.')}</AlertDescription></Alert></DialogFeedback> : null}
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
          <Label htmlFor="assignmentDueAt">Due at (optional)</Label>
          <Input id="assignmentDueAt" type="datetime-local" aria-invalid={Boolean(dueAtError)} aria-describedby={dueAtError ? 'assignmentDueAt-help assignmentDueAt-error' : 'assignmentDueAt-help'} {...form.register('dueAt')} />
          <p id="assignmentDueAt-help" className="text-xs text-muted-foreground">Use your local date and time.</p>
          {dueAtError ? <FieldError id="assignmentDueAt-error">{dueAtError}</FieldError> : null}
        </fieldset>
      </form>
      <DialogFooter>{hasAssignment ? <Button type="button" variant="outline" disabled={pending} onClick={() => onSave({ assignToMe: false, dueAt: null })}>Clear assignment</Button> : null}<Button type="button" variant="outline" disabled={pending} onClick={requestClose}>Cancel</Button><Button type="submit" form="operational-assignment" disabled={pending}>{pending ? 'Saving…' : assignedToMe ? 'Update my assignment' : 'Assign to me'}</Button></DialogFooter>
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
          <CardTitle>{workflow === 'lab' ? 'Commercial scope' : 'Operational facts'}</CardTitle>
          <CardDescription>
            {workflow === 'lab'
              ? 'The priced Customer scope remains separate from specimen receipt, accessioning, and laboratory execution.'
              : 'Tenant-visible and internal evidence remain separated.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflow === 'lab' && 'sourceGroups' in item ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="font-medium">Requested specimens</dt><dd className="mt-1 text-muted-foreground">{item.requestedSpecimenCount}</dd></div>
              <div><dt className="font-medium">Biological sources</dt><dd className="mt-1 text-muted-foreground">{item.sourceGroups.map((group) => `${group.biologicalSource} (${group.specimenCount})`).join(', ')}</dd></div>
              <div><dt className="font-medium">Storage requirements</dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.storageRequirements}</dd></div>
              <div><dt className="font-medium">Safety declaration</dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.safetyDeclaration}</dd></div>
              <div>
                <dt className="font-medium">Proposed price</dt>
                <dd className="mt-1 text-muted-foreground">
                  {item.proposedUnitPrice != null
                    ? `${formatMoney(item.proposedUnitPrice, item.proposedCurrency ?? 'USD')} per specimen · ${formatMoney(item.proposedUnitPrice * item.requestedSpecimenCount, item.proposedCurrency ?? 'USD')} proposed subtotal`
                    : 'No price proposed'}
                </dd>
              </div>
              {quote ? (
                <div>
                  <dt className="font-medium">Current quote</dt>
                  <dd className="mt-1">
                    <span className="font-semibold text-foreground">{formatMoney(quote.total, quote.currency)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {quote.tax === 0 ? 'Pre-tax total' : `${formatMoney(quote.subtotal, quote.currency)} pre-tax`} · Revision {quote.revision} · {humanizeStatus(quote.status)}
                    </span>
                  </dd>
                </div>
              ) : null}
              {item.priceProposalNote ? <div><dt className="font-medium">Proposal note</dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{item.priceProposalNote}</dd></div> : null}
            </dl>
          ) : null}
          {workflow === 'reagent' && 'lines' in item ? <ul className="divide-y">{item.lines.map((line) => <li key={line.id} className="flex justify-between gap-3 py-3"><span>{line.description} · {line.remainingQuantity} remaining</span><span>{line.currency} {line.lineTotal.toFixed(2)}</span></li>)}</ul> : null}
          {workflow === 'assembly' && 'inputFiles' in item ? <div><p className="text-sm">{item.profileName} v{item.assemblyProfileVersion}</p><p className="mt-2 text-sm text-muted-foreground">{item.inputFiles.length} input file(s) · {item.processingRuns.length} processing run(s) · {item.outputReleases.length} output release(s)</p></div> : null}
        </CardContent>
      </Card>
      <div className="space-y-5">
        {item.tenantSafeReason ? <Alert><AlertTitle>Tenant-safe reason</AlertTitle><AlertDescription>{item.tenantSafeReason}</AlertDescription></Alert> : null}
        {internalNote ? <Alert><AlertTitle>Internal context</AlertTitle><AlertDescription>{internalNote}</AlertDescription></Alert> : null}
        <Card><CardHeader><CardTitle>Audit timeline</CardTitle></CardHeader><CardContent><ol className="space-y-3">{timeline.slice().reverse().map((entry) => <li key={entry.id} className="border-l-2 pl-3 text-sm"><strong>{humanizeStatus(entry.toStatus)}</strong><span className="block text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</span>{entry.internalNote ? <span className="mt-1 block text-muted-foreground"><span className="font-medium text-foreground">Internal context:</span> {entry.internalNote}</span> : null}</li>)}</ol></CardContent></Card>
      </div>
    </div>
  )
}

function CommercialControlPanel({
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
  const mayQuote = (workflow === 'lab' || workflow === 'assembly' && !('isIncludedAssembly' in item && item.isIncludedAssembly)) && item.status === 'QuoteInPreparation'
  const workflowPath = workflow === 'lab' ? 'lab-service-orders' : workflow === 'reagent' ? 'reagent-orders' : 'data-assembly-requests'
  async function openQuote() {
    setQuoteOpening(true)
    try {
      await onSaved()
      setQuoteOpen(true)
    } finally {
      setQuoteOpening(false)
    }
  }
  return (
    <div className="mt-5 space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Commercial control</CardTitle>
              <CardDescription>
                {workflow === 'lab'
                  ? 'Pricing, quotes, Customer decisions, and the immutable order remain in Order intake. Receipt, accessioning, and execution are performed in Lab operations.'
                  : 'Commercial approval and the immutable order remain here.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {mayQuote ? <Button type="button" disabled={quoteOpening} onClick={() => void openQuote()}>{quoteOpening ? 'Refreshing…' : workflow === 'lab' && 'proposedUnitPrice' in item && item.proposedUnitPrice != null ? 'Review proposed price' : 'Issue quote'}</Button> : null}
              {workflow === 'lab' && labWorkOrderId ? <Button asChild variant="outline"><Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWorkOrderId }} search={{ section: undefined }}>Open Lab work</Link></Button> : null}
            </div>
          </div>
        </CardHeader>
        {workflow === 'lab' ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {labWorkOrderId
                ? 'The commercial order remains the source record; Lab operations owns all authorized physical and scientific work.'
                : 'Lab work is created only after quote acceptance and finalization of the exact sample roster.'}
            </p>
          </CardContent>
        ) : null}
      </Card>
      <CancellationDecisionPanel
        workflowPath={workflowPath}
        recordId={item.id}
        version={item.version}
        requests={item.cancellationRequests}
        reagentLines={workflow === 'reagent' && 'lines' in item ? item.lines : undefined}
        onSaved={onSaved}
      />
      {workflow === 'lab' || workflow === 'assembly' ? (
        <PlatformQuoteDialog
          open={quoteOpen}
          workflow={workflow}
          recordId={item.id}
          defaultQuantity={workflow === 'lab' && 'requestedSpecimenCount' in item ? item.requestedSpecimenCount : undefined}
          priceProposal={workflow === 'lab' && 'proposedUnitPrice' in item && item.proposedUnitPrice != null ? {
            unitPrice: item.proposedUnitPrice,
            currency: item.proposedCurrency ?? 'USD',
            note: item.priceProposalNote,
            proposedByUserId: item.priceProposedByUserId,
            proposedAt: item.priceProposedAt,
          } : null}
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

function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
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
