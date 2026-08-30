import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import {
  getLabManufacturingOrder,
  getLabOperationsError,
  listLabManufacturingOrders,
  listLabPSeqKitOfferings,
  runLabManufacturingAction,
} from '#/api/lab-operations'
import { type DataAssemblyRequest, type ReagentOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus, OrderStatusBadge } from '#/features/orders/OrderStatusBadge'
import { AssemblyOperationsPanel } from '#/features/orders/operations/AssemblyOperationsPanel'
import { ReagentOperationsPanel } from '#/features/orders/operations/ReagentOperationsPanel'

export type ManufacturingWorkflow = 'reagent' | 'assembly'

export function LabManufacturingQueue({ workflow, apiEnabled }: { workflow: ManufacturingWorkflow; apiEnabled: boolean }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const query = useQuery({
    queryKey: ['lab-manufacturing-orders', workflow, search, status],
    queryFn: () => listLabManufacturingOrders(workflow, { search: search || undefined, status: status || undefined }),
    enabled: apiEnabled,
  })
  const isKit = workflow === 'reagent'
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isKit ? 'PSeq kit fulfillment' : 'Data assembly'}</CardTitle>
        <CardDescription>
          {isKit
            ? 'Prepare, substitute, ship, and complete PSeq kit orders received from Commercial operations.'
            : 'Validate accepted input, run the assembly workflow, review quality, and release outputs.'}
        </CardDescription>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor={`${workflow}-manufacturing-search`}>Search</Label><Input id={`${workflow}-manufacturing-search`} className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div><Label htmlFor={`${workflow}-manufacturing-status`}>Status</Label><select id={`${workflow}-manufacturing-status`} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{manufacturingStatuses[workflow].map((item) => <option key={item} value={item}>{humanizeStatus(item)}</option>)}</select></div>
        </div>
      </CardHeader>
      <CardContent>
        {query.error ? <Alert variant="destructive"><AlertTitle>Manufacturing queue could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh the queue and try again.')}</AlertDescription></Alert> : null}
        {query.isLoading ? <p role="status">Loading manufacturing queue…</p> : null}
        <div className="divide-y">
          {query.data?.items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <Link
                  to={isKit ? '/lab-operations/pseq-kit-orders/$orderId' : '/lab-operations/data-assembly/$orderId'}
                  params={{ orderId: item.id }}
                  search={{ section: undefined }}
                  className="font-medium text-primary hover:underline"
                >
                  {item.number}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{item.reference ?? 'No reference'} · updated {formatDateTime(item.updatedAt)}</p>
              </div>
              <OrderStatusBadge status={item.status} />
            </div>
          ))}
        </div>
        {!query.isLoading && !query.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">No records in this manufacturing queue.</p> : null}
      </CardContent>
    </Card>
  )
}

export function LabManufacturingOrderPage({ workflow, orderId }: { workflow: ManufacturingWorkflow; orderId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const apiEnabled = Boolean(session?.capabilities.canManageLabOperations) && authProvider !== 'mock'
  const client = useQueryClient()
  const [reasonAction, setReasonAction] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const order = useQuery<ReagentOrder | DataAssemblyRequest>({
    queryKey: ['lab-manufacturing-order', workflow, orderId],
    queryFn: async (): Promise<ReagentOrder | DataAssemblyRequest> => await getLabManufacturingOrder(workflow, orderId),
    enabled: apiEnabled,
  })
  const offerings = useQuery({
    queryKey: ['lab-pseq-kit-offerings', order.data?.organizationId],
    queryFn: () => listLabPSeqKitOfferings(order.data!.organizationId),
    enabled: apiEnabled && workflow === 'reagent' && Boolean(order.data),
  })
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['lab-manufacturing-order', workflow, orderId] })
    await client.invalidateQueries({ queryKey: ['lab-manufacturing-orders', workflow] })
  }
  const transition = useMutation({
    mutationFn: async ({ action, actionReason }: { action: string; actionReason?: string }) => {
      if (!order.data) throw new Error('The manufacturing record has not loaded.')
      return runLabManufacturingAction<ReagentOrder | DataAssemblyRequest>(workflow, `${orderId}/${action}`, {
        version: order.data.version,
        reason: actionReason,
        internalNote: null,
      }, workflow === 'reagent' && action === 'fulfill')
    },
    onSuccess: async () => { setReasonAction(null); setReason(''); await refresh() },
  })

  if (!apiEnabled) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Lab operations unavailable</AlertTitle><AlertDescription>An assigned Phaeno laboratory role is required.</AlertDescription></Alert></main>
  if (order.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading manufacturing record…</p></main>
  if (order.error || !order.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Manufacturing record could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(order.error, 'Return to Lab operations and try again.')}</AlertDescription></Alert></main>

  const item = order.data
  const number = 'orderNumber' in item ? item.orderNumber : item.requestNumber
  const actions = manufacturingActions(workflow, item.status, item.resumeStatus)
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground"><Link to="/lab-operations" search={{ section: workflow === 'reagent' ? 'kits' : 'assembly' }} className="hover:underline">Lab operations</Link> / {workflow === 'reagent' ? 'PSeq kits' : 'Data assembly'} / <span className="font-mono">{number}</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{number}</h1><OrderStatusBadge status={item.status} /></div>
          <p className="mt-2 text-sm text-muted-foreground">Manufacturing record for organization {item.organizationId}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/order-operations/$workflow/$orderId" params={{ workflow, orderId }}>View commercial order</Link></Button>
          {actions.map((action) => <Button key={action.path} type="button" variant={action.reason ? 'outline' : 'default'} disabled={transition.isPending} onClick={() => action.reason ? setReasonAction(action.path) : transition.mutate({ action: action.path })}>{action.label}</Button>)}
        </div>
      </section>
      {transition.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Manufacturing status was not changed</AlertTitle><AlertDescription>{getLabOperationsError(transition.error, 'Refresh the record and try again.')}</AlertDescription></Alert> : null}
      {workflow === 'reagent' && ['Placed', 'UnderReview'].includes(item.status) ? <Alert className="mb-5"><AlertTitle>Awaiting Commercial review</AlertTitle><AlertDescription>Order operations must accept or reject this PSeq Kit order before Lab fulfillment begins.</AlertDescription></Alert> : null}
      {item.status === 'OnHold' && !actions.length ? <Alert className="mb-5"><AlertTitle>Commercial hold</AlertTitle><AlertDescription>This hold must be resolved in Order operations before Lab manufacturing can continue.</AlertDescription></Alert> : null}
      {offerings.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Substitution options could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(offerings.error, 'The order can still be reviewed, but substitutions are unavailable until this list loads.')}</AlertDescription></Alert> : null}
      {workflow === 'reagent' && 'lines' in item ? <ReagentOperationsPanel order={item} offerings={offerings.data ?? []} onSaved={refresh} /> : null}
      {workflow === 'assembly' && 'inputFiles' in item && item.status === 'QuoteInPreparation' ? <Alert><AlertTitle>Commercial quote required</AlertTitle><AlertDescription>Lab intake is complete. Commercial staff must issue the quote in Order operations before manufacturing can continue.</AlertDescription></Alert> : null}
      {workflow === 'assembly' && 'inputFiles' in item && item.status !== 'QuoteInPreparation' ? <AssemblyOperationsPanel request={item} onSaved={refresh} /> : null}
      <Dialog open={reasonAction !== null} onOpenChange={(open) => !open && setReasonAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{reasonAction ? humanizeStatus(reasonAction) : 'Manufacturing action'}</DialogTitle><DialogDescription>Record the external-safe reason for this manufacturing decision.</DialogDescription></DialogHeader>
          <div><Label htmlFor="manufacturing-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><textarea id="manufacturing-reason" className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} /></div>
          <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={!reason.trim() || transition.isPending} onClick={() => reasonAction && transition.mutate({ action: reasonAction, actionReason: reason })}>Apply decision</Button></RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function manufacturingActions(workflow: ManufacturingWorkflow, status: string, resumeStatus?: string | null) {
  if (workflow === 'reagent') {
    if (status === 'Accepted') return [{ label: 'Start processing', path: 'start-processing', reason: false }, { label: 'Place on hold', path: 'hold', reason: true }]
    if (status === 'Shipped') return [{ label: 'Complete fulfillment', path: 'fulfill', reason: false }, { label: 'Place on hold', path: 'hold', reason: true }]
    if (status === 'OnHold' && ['Accepted', 'Processing', 'PartiallyShipped', 'Shipped'].includes(resumeStatus ?? '')) return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (['Processing', 'PartiallyShipped'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  if (workflow === 'assembly') {
    if (status === 'Submitted') return [{ label: 'Begin input validation', path: 'begin-intake', reason: false }]
    if (status === 'IntakeValidation') return [{ label: 'Accept input', path: 'accept-intake', reason: false }, { label: 'Place on hold', path: 'hold', reason: true }]
    if (status === 'OnHold' && ['Submitted', 'IntakeValidation', 'PlacedQueued', 'Processing', 'OutputReview', 'OutputAvailable'].includes(resumeStatus ?? '')) return [{ label: 'Release hold', path: 'release-hold', reason: true }]
    if (['PlacedQueued', 'Processing', 'OutputReview', 'OutputAvailable'].includes(status)) return [{ label: 'Place on hold', path: 'hold', reason: true }]
  }
  return []
}

const manufacturingStatuses: Record<ManufacturingWorkflow, string[]> = {
  reagent: ['Placed', 'UnderReview', 'Accepted', 'Processing', 'PartiallyShipped', 'Shipped', 'OnHold', 'Fulfilled', 'Cancelled', 'Rejected'],
  assembly: ['Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedQueued', 'Processing', 'OutputReview', 'OutputAvailable', 'OnHold', 'Completed', 'Cancelled', 'Rejected'],
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
