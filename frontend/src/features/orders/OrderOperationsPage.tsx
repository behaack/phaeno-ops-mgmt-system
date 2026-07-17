import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Boxes, FlaskConical, PlugZap, RefreshCw, Workflow as WorkflowIcon } from 'lucide-react'
import { useState } from 'react'

import { getOrderConfiguration, getOrderErrorMessage, getPlatformOrder, listIntegrationMessages, listNotificationMessages, listPlatformOrders, retryIntegrationMessage, retryNotificationMessage, runPlatformAction, updateOperationalAssignment, type DataAssemblyRequest, type IntegrationMessage, type LabServiceOrder, type NotificationMessage, type PagedResult, type ReagentOrder } from '#/api/order-management'
import { listOrganizations } from '#/api/data-provisioning'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'
import { AssemblyOperationsPanel } from './operations/AssemblyOperationsPanel'
import { LabOperationsPanel } from './operations/LabOperationsPanel'
import { ReagentOperationsPanel } from './operations/ReagentOperationsPanel'

type Workflow = 'lab' | 'reagent' | 'assembly'
type OrderSection = Workflow | 'integrations'

const orderSections: ReadonlyArray<WorkspaceSidebarItem<OrderSection>> = [
  { value: 'lab', label: 'Lab', description: 'Pricing, samples, and laboratory execution', icon: FlaskConical },
  { value: 'reagent', label: 'Reagents', description: 'Review, processing, and fulfillment', icon: Boxes },
  { value: 'assembly', label: 'Assembly', description: 'Intake, processing, and output release', icon: WorkflowIcon },
  { value: 'integrations', label: 'Integrations', description: 'Delivery failures and recovery queues', icon: PlugZap },
]

export function OrderOperationsPage({ workflow, orderId }: { workflow?: Workflow; orderId?: string }) {
  const { authProvider, session } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canViewAllOperationalOrders)
  const apiEnabled = canView && authProvider !== 'mock'
  if (!canView) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order operations unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  if (workflow && orderId) return <OperationalDetail workflow={workflow} orderId={orderId} apiEnabled={apiEnabled} userId={session?.user?.id ?? null} />
  return <OperationalQueues apiEnabled={apiEnabled} mock={authProvider === 'mock'} userId={session?.user?.id ?? null} />
}

function OperationalQueues({ apiEnabled, mock, userId }: { apiEnabled: boolean; mock: boolean; userId: string | null }) {
  const [section, setSection] = useState<OrderSection>('lab')
  const organizations = useQuery({ queryKey: ['order-operations', 'organizations'], queryFn: listOrganizations, enabled: apiEnabled })
  const integrations = useQuery({ queryKey: ['order-integrations'], queryFn: () => listIntegrationMessages(), enabled: apiEnabled })
  const notifications = useQuery({ queryKey: ['order-notifications'], queryFn: () => listNotificationMessages(), enabled: apiEnabled })
  const organizationOptions = organizations.data?.map((item) => ({ id: item.id, name: item.name })) ?? []
  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Order operations"
        items={orderSections}
        value={section}
        onValueChange={setSection}
      >
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            <h1 className="text-3xl font-semibold">Order operations</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Cross-organization queues for pricing, laboratory execution, reagent fulfillment,
              data assembly, holds, cancellations, and integration recovery.
            </p>
          </section>
          {mock ? (
            <Alert className="mb-5">
              <AlertTitle>Connected queues are paused in mock-session mode</AlertTitle>
              <AlertDescription>Use a real Phaeno session to work operational orders.</AlertDescription>
            </Alert>
          ) : null}
          {section === 'lab' ? <QueueCard title="Laboratory queue" workflow="lab" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'reagent' ? <QueueCard title="Reagent queue" workflow="reagent" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'assembly' ? <QueueCard title="Assembly queue" workflow="assembly" apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === 'integrations' ? <IntegrationQueue query={integrations} notifications={notifications} apiEnabled={apiEnabled} /> : null}
        </div>
      </WorkspaceSidebar>
    </main>
  )
}

function QueueCard({ title, workflow, apiEnabled, userId, organizations }: { title: string; workflow: Workflow; apiEnabled: boolean; userId: string | null; organizations: Array<{ id: string; name: string }> }) {
  const [search, setSearch] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [status, setStatus] = useState('')
  const [view, setView] = useState<'all' | 'mine' | 'unassigned' | 'overdue' | 'holds'>('all')
  const [updatedFrom, setUpdatedFrom] = useState('')
  const [updatedTo, setUpdatedTo] = useState('')
  const query = useQuery({ queryKey: ['platform-orders', workflow, search, organizationId, status, view, updatedFrom, updatedTo], queryFn: () => listPlatformOrders(workflow, {
    search: search || undefined, organizationId: organizationId || undefined, status: status || undefined,
    assignedToUserId: view === 'mine' ? userId ?? undefined : undefined, unassigned: view === 'unassigned' || undefined,
    overdue: view === 'overdue' || undefined, holds: view === 'holds' || undefined,
    updatedFrom: updatedFrom ? `${updatedFrom}T00:00:00.000Z` : undefined, updatedTo: updatedTo ? `${nextDate(updatedTo)}T00:00:00.000Z` : undefined,
  }), enabled: apiEnabled })
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Newest activity first. Filter actionable work, then open a record to assign and operate it.</CardDescription><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div><Label htmlFor={`${workflow}-queue-search`}>Search</Label><Input id={`${workflow}-queue-search`} className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div><Label htmlFor={`${workflow}-queue-organization`}>Organization</Label><select id={`${workflow}-queue-organization`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">All organizations</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><Label htmlFor={`${workflow}-queue-status`}>Status</Label><select id={`${workflow}-queue-status`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{workflowStatuses[workflow].map((item) => <option key={item} value={item}>{humanizeStatus(item)}</option>)}</select></div><div><Label htmlFor={`${workflow}-queue-view`}>Queue view</Label><select id={`${workflow}-queue-view`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={view} onChange={(event) => setView(event.target.value as typeof view)}><option value="all">All work</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option><option value="overdue">Overdue</option><option value="holds">On hold</option></select></div><div><Label htmlFor={`${workflow}-queue-from`}>Updated from</Label><Input id={`${workflow}-queue-from`} type="date" className="mt-2" value={updatedFrom} onChange={(event) => setUpdatedFrom(event.target.value)} /></div><div><Label htmlFor={`${workflow}-queue-to`}>Updated through</Label><Input id={`${workflow}-queue-to`} type="date" className="mt-2" value={updatedTo} onChange={(event) => setUpdatedTo(event.target.value)} /></div></div></CardHeader><CardContent>{query.error ? <Alert variant="destructive"><AlertTitle>Queue could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status">Loading queue…</p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link to="/order-operations/$workflow/$orderId" params={{ workflow, orderId: item.id }} className="font-medium text-primary hover:underline">{item.number}</Link><p className="mt-1 text-xs text-muted-foreground">{organizations.find((org) => org.id === item.organizationId)?.name ?? item.organizationId} · {item.reference ?? 'No reference'}</p><p className="mt-1 text-xs text-muted-foreground">{item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned' : 'Unassigned'}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''}</p></div><div className="flex items-center gap-2">{item.isOverdue ? <span className="text-xs font-medium text-destructive">Overdue</span> : null}<OrderStatusBadge status={item.status} /></div></div>)}</div>{!query.isLoading && !query.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">No records in this queue.</p> : null}</CardContent></Card>
}

function IntegrationQueue({ query, notifications, apiEnabled }: { query: UseQueryResult<PagedResult<IntegrationMessage>, Error>; notifications: UseQueryResult<PagedResult<NotificationMessage>, Error>; apiEnabled: boolean }) {
  const client = useQueryClient()
  const retry = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryIntegrationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-integrations'] }) })
  const retryNotification = useMutation({ mutationFn: ({ id, version }: { id: string; version: number }) => retryNotificationMessage(id, version), onSuccess: () => client.invalidateQueries({ queryKey: ['order-notifications'] }) })
  return <div className="space-y-5"><Card><CardHeader><CardTitle>QuickBooks integration queue</CardTitle><CardDescription>Retry bounded failures after resolving configuration or external-service issues.</CardDescription></CardHeader><CardContent>{query.error ? <Alert variant="destructive"><AlertTitle>Integration queue unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{query.isLoading ? <p role="status">Loading integration messages…</p> : null}<div className="divide-y">{query.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{humanizeStatus(item.operation)} · {item.workflowType}</p><p className="mt-1 text-xs text-muted-foreground">Attempts {item.attemptCount} · Next {formatDateTime(item.nextAttemptAt)}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' || item.status === 'NeedsAttention' ? <Button type="button" variant="outline" disabled={!apiEnabled || retry.isPending} onClick={() => retry.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" />Retry</Button> : null}</div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Notification delivery queue</CardTitle><CardDescription>Failed transactional email remains visible and can be retried after delivery configuration is corrected.</CardDescription></CardHeader><CardContent>{notifications.error ? <Alert variant="destructive"><AlertTitle>Notification queue unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(notifications.error, 'Try refreshing.')}</AlertDescription></Alert> : null}{notifications.isLoading ? <p role="status">Loading notification messages…</p> : null}<div className="divide-y">{notifications.data?.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">{item.workflowType} · {humanizeStatus(item.eventType)} · Attempts {item.attemptCount}</p>{item.lastError ? <p className="mt-1 text-sm text-destructive">{item.lastError}</p> : null}</div><div className="flex items-center gap-2"><OrderStatusBadge status={item.status} />{item.status === 'Failed' ? <Button type="button" variant="outline" disabled={!apiEnabled || retryNotification.isPending} onClick={() => retryNotification.mutate({ id: item.id, version: item.version })}><RefreshCw data-icon="inline-start" />Retry</Button> : null}</div></div>)}</div></CardContent></Card></div>
}

function OperationalDetail({ workflow, orderId, apiEnabled, userId }: { workflow: Workflow; orderId: string; apiEnabled: boolean; userId: string | null }) {
  const client = useQueryClient()
  const [reasonDialog, setReasonDialog] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [assignmentDueAt, setAssignmentDueAt] = useState('')
  const order = useQuery({ queryKey: ['platform-order', workflow, orderId], queryFn: () => getPlatformOrder(workflow, orderId), enabled: apiEnabled })
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['platform-order', workflow, orderId] })
    await client.invalidateQueries({ queryKey: ['platform-orders', workflow] })
  }
  const mutation = useMutation({
    mutationFn: async (input: { action: string; reason?: string }) => {
      if (!order.data) throw new Error('The order has not loaded.')
      const base = workflow === 'lab' ? `lab-service-orders/${orderId}` : workflow === 'reagent' ? `reagent-orders/${orderId}` : `data-assembly-requests/${orderId}`
      return runPlatformAction(`${base}/${input.action}`, { version: order.data.version, reason: input.reason, internalNote: null })
    },
    onSuccess: async () => { setReasonDialog(null); setReason(''); await refresh() },
  })
  const assignment = useMutation({
    mutationFn: async (assignToMe: boolean) => {
      if (!order.data) throw new Error('The order has not loaded.')
      return updateOperationalAssignment(workflow, orderId, { version: order.data.version, assignToMe, dueAt: assignToMe && assignmentDueAt ? new Date(assignmentDueAt).toISOString() : null })
    },
    onSuccess: async () => { setAssignmentOpen(false); await refresh() },
  })
  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>Connected operations are paused</AlertTitle><AlertDescription>Use a real Phaeno session.</AlertDescription></Alert></main>
  if (order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading operational record…</p></main>
  if (order.error || !order.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Operational record could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(order.error, 'Return to the operations queue.')}</AlertDescription></Alert></main>
  const item = order.data
  const number = 'orderNumber' in item ? item.orderNumber : item.requestNumber
  const actions = primaryActions(workflow, item.status)
  return <main className="page-wrap px-4 py-8"><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-muted-foreground"><Link to="/order-operations" className="hover:underline">Order operations</Link> / {humanizeStatus(workflow)} / <span className="font-mono">{number}</span></p><div className="mt-2 flex items-center gap-3"><h1 className="text-3xl font-semibold">{number}</h1><OrderStatusBadge status={item.status} /></div><p className="mt-2 text-sm text-muted-foreground">Organization {item.organizationId} · {item.assignedToUserId ? item.assignedToUserId === userId ? 'Assigned to you' : 'Assigned to another operator' : 'Unassigned'}{item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ''} · Version {item.version}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setAssignmentDueAt(item.dueAt ? new Date(item.dueAt).toISOString().slice(0, 16) : ''); setAssignmentOpen(true) }}>Assignment</Button>{actions.map((action) => <Button key={action.path} type="button" variant={action.reason ? 'outline' : 'default'} disabled={mutation.isPending} onClick={() => action.reason ? setReasonDialog(action.path) : mutation.mutate({ action: action.path })}>{action.label}</Button>)}</div></section>{mutation.error || assignment.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Operation failed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error ?? assignment.error, 'Reload the record and try again.')}</AlertDescription></Alert> : null}{configuration.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Commercial configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Operational status changes remain available, but quote and catalog actions are paused.')}</AlertDescription></Alert> : null}<OperationalSummary workflow={workflow} item={item} />{workflow === 'lab' && 'samples' in item ? <LabOperationsPanel order={item} catalogItems={configuration.data?.catalogItems ?? []} onSaved={refresh} /> : null}{workflow === 'reagent' && 'lines' in item && configuration.data ? <ReagentOperationsPanel order={item} configuration={configuration.data} onSaved={refresh} /> : null}{workflow === 'assembly' && 'inputFiles' in item ? <AssemblyOperationsPanel request={item} catalogItems={configuration.data?.catalogItems ?? []} onSaved={refresh} /> : null}<Dialog open={reasonDialog !== null} onOpenChange={(open) => !open && setReasonDialog(null)}><DialogContent><DialogHeader><DialogTitle>{reasonDialog ? humanizeStatus(reasonDialog) : 'Record action'} for {number}</DialogTitle><DialogDescription>Provide a tenant-safe reason. Internal scientific or commercial details must remain in the separate internal record.</DialogDescription></DialogHeader><div><Label htmlFor="operationReason">Tenant-safe reason <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label><textarea id="operationReason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={!reason.trim() || mutation.isPending} onClick={() => reasonDialog && mutation.mutate({ action: reasonDialog, reason })}>Apply status change</Button></DialogFooter></DialogContent></Dialog><Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}><DialogContent><DialogHeader><DialogTitle>Operational assignment</DialogTitle><DialogDescription>Assign this record to yourself and set an optional operational due time. Dedicated staff-role routing remains outside the initial release.</DialogDescription></DialogHeader><div><Label htmlFor="assignmentDueAt">Due at</Label><Input id="assignmentDueAt" type="datetime-local" className="mt-2" value={assignmentDueAt} onChange={(event) => setAssignmentDueAt(event.target.value)} /></div><DialogFooter>{item.assignedToUserId ? <Button type="button" variant="outline" disabled={assignment.isPending} onClick={() => assignment.mutate(false)}>Clear assignment</Button> : null}<DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={assignment.isPending} onClick={() => assignment.mutate(true)}>{item.assignedToUserId === userId ? 'Update my assignment' : 'Assign to me'}</Button></DialogFooter></DialogContent></Dialog></main>
}

function OperationalSummary({ workflow, item }: { workflow: Workflow; item: LabServiceOrder | ReagentOrder | DataAssemblyRequest }) {
  const internalNote = item.internalNote
  const timeline = item.timeline
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"><Card><CardHeader><CardTitle>Operational facts</CardTitle><CardDescription>Tenant-visible and internal evidence remain separated.</CardDescription></CardHeader><CardContent>{workflow === 'lab' && 'samples' in item ? <ul className="divide-y">{item.samples.map((sample) => <li key={sample.id} className="flex justify-between gap-3 py-3"><span>{sample.customerSampleId}{sample.accessionId ? ` · ${sample.accessionId}` : ''}</span><OrderStatusBadge status={sample.status} /></li>)}</ul> : null}{workflow === 'reagent' && 'lines' in item ? <ul className="divide-y">{item.lines.map((line) => <li key={line.id} className="flex justify-between gap-3 py-3"><span>{line.description} · {line.remainingQuantity} remaining</span><span>{line.currency} {line.lineTotal.toFixed(2)}</span></li>)}</ul> : null}{workflow === 'assembly' && 'inputFiles' in item ? <div><p className="text-sm">{item.profileName} v{item.assemblyProfileVersion}</p><p className="mt-2 text-sm text-muted-foreground">{item.inputFiles.length} input file(s) · {item.processingRuns.length} processing run(s) · {item.outputReleases.length} output release(s)</p></div> : null}</CardContent></Card><div className="space-y-5">{item.tenantSafeReason ? <Alert><AlertTitle>Tenant-safe reason</AlertTitle><AlertDescription>{item.tenantSafeReason}</AlertDescription></Alert> : null}{internalNote ? <Alert variant="destructive"><AlertTitle>Internal note</AlertTitle><AlertDescription>{internalNote}</AlertDescription></Alert> : null}<Card><CardHeader><CardTitle>Audit timeline</CardTitle></CardHeader><CardContent><ol className="space-y-3">{timeline.slice().reverse().map((entry) => <li key={entry.id} className="border-l-2 pl-3 text-sm"><strong>{humanizeStatus(entry.toStatus)}</strong><span className="block text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</span>{entry.internalNote ? <span className="mt-1 block text-destructive">Internal: {entry.internalNote}</span> : null}</li>)}</ol></CardContent></Card></div></div>
}

function primaryActions(workflow: Workflow, status: string) {
  if (workflow === 'lab') {
    if (status === 'SubmittedForQuote') return [{ label: 'Begin quote', path: 'begin-quote', reason: false }, { label: 'Request changes', path: 'request-changes', reason: true }]
    if (status === 'QuoteInPreparation') return [{ label: 'Request changes', path: 'request-changes', reason: true }, { label: 'Decline request', path: 'decline', reason: true }]
    if (status === 'OnHold') return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (!['Completed', 'Cancelled', 'Declined'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  if (workflow === 'reagent') {
    if (status === 'UnderReview') return [{ label: 'Accept order', path: 'accept', reason: false }, { label: 'Reject', path: 'reject', reason: true }]
    if (status === 'Accepted') return [{ label: 'Start processing', path: 'start-processing', reason: false }]
    if (status === 'Shipped') return [{ label: 'Close fulfilled', path: 'fulfill', reason: false }]
    if (status === 'OnHold') return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (!['Fulfilled', 'Cancelled', 'Rejected'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  if (workflow === 'assembly') {
    if (status === 'Submitted') return [{ label: 'Begin intake', path: 'begin-intake', reason: false }]
    if (status === 'IntakeValidation') return [{ label: 'Accept intake', path: 'accept-intake', reason: false }, { label: 'Request changes', path: 'request-changes', reason: true }, { label: 'Reject', path: 'reject', reason: true }]
    if (status === 'OnHold') return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (!['Completed', 'Cancelled', 'Rejected'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  return []
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function nextDate(value: string) { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10) }

const workflowStatuses: Record<Workflow, string[]> = {
  lab: ['DraftRequest', 'SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Declined'],
  reagent: ['Draft', 'Placed', 'UnderReview', 'Accepted', 'Processing', 'PartiallyShipped', 'Shipped', 'OnHold', 'CancellationRequested', 'Fulfilled', 'Cancelled', 'Rejected'],
  assembly: ['Draft', 'Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedQueued', 'Processing', 'OutputReview', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Rejected'],
}
