import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { listCrmOrderHandoffs, type CrmOrderHandoff } from '#/api/crm'
import {
  getOrderErrorMessage,
  listCommercialOrders,
  listCustomerOrderOptions,
  type CommercialOrderListItem,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { LabJobDetailsDialog } from './LabJobDetailsDialog'
import { OrderStatusBadge } from './OrderStatusBadge'

type OrganizationOption = { id: string; name: string }
type IntakeQueueItem =
  | { kind: 'order'; updatedAt: string; order: CommercialOrderListItem }
  | { kind: 'handoff'; updatedAt: string; handoff: CrmOrderHandoff }

export function CommercialOrderIntakePanel({
  apiEnabled,
  mock,
  userId,
  organizations,
}: {
  apiEnabled: boolean
  mock: boolean
  userId: string | null
  organizations: OrganizationOption[]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedHandoff, setSelectedHandoff] = useState<CrmOrderHandoff | null>(null)
  const searchState = useSearch({ strict: false })
  const search = searchState.intakeSearch ?? ''
  const view = searchState.intakeView ?? 'active'
  const page = searchState.intakePage ?? 1
  const setFilters = (changes: { intakeSearch?: string; intakeView?: 'active' | 'holds' | 'all'; intakePage?: number }) => {
    void navigate({ to: '/order-operations', search: (previous) => ({ ...previous, orderSection: 'intake', intakePage: 1, ...changes }), replace: true })
  }
  const customers = useQuery({
    queryKey: ['order-operations', 'customer-options'],
    queryFn: listCustomerOrderOptions,
    enabled: apiEnabled,
  })
  const handoffs = useQuery({
    queryKey: ['order-intake-handoffs'],
    queryFn: listCrmOrderHandoffs,
    enabled: apiEnabled,
  })
  const orders = useQuery({
    queryKey: ['commercial-orders', 'intake', view, search, page],
    queryFn: () => listCommercialOrders({ activeIntake: view === 'active', holds: view === 'holds', search: search.trim() || undefined, page, pageSize: 25 }),
    enabled: apiEnabled,
  })
  const eligibleCustomers = customers.data ?? []
  const organizationNames = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization.name])),
    [organizations],
  )
  const queueItems = useMemo(() => {
    const items: IntakeQueueItem[] = [
      ...(orders.data?.items
        .map((order) => ({ kind: 'order' as const, updatedAt: order.updatedAt, order })) ?? []),
      ...(handoffs.data
        ?.filter((item) => view === 'active' && page === 1 && !item.handoff.orderId)
        .map((handoff) => ({ kind: 'handoff' as const, updatedAt: handoff.handoff.createdAt, handoff })) ?? []),
    ]
    items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const term = search.trim().toLocaleLowerCase()
    if (!term) return items
    return items.filter((item) => item.kind === 'order' || intakeSearchText(item, organizationNames).includes(term))
  }, [handoffs.data, orders.data?.items, organizationNames, search, view, page])

  async function refreshIntake() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['commercial-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['order-intake-handoffs'] }),
    ])
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Commercial order intake</CardTitle>
              <CardDescription className="mt-1">
                Create Customer orders, check readiness, and manage pricing through quote acceptance. You can start pricing before a Customer administrator is active. Authorized laboratory work continues in Lab operations.
              </CardDescription>
            </div>
            <Button
              type="button"
              disabled={!mock && (!apiEnabled || customers.isLoading || customers.isError || eligibleCustomers.length === 0)}
              onClick={() => setCreateOpen(true)}
            >
              <Plus data-icon="inline-start" /> New Customer order
            </Button>
          </div>
        </CardHeader>
        {customers.error ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Customer organizations could not be loaded</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(customers.error, 'Refresh the intake workspace and try again.')}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
        {!customers.isLoading && !customers.isError && apiEnabled && eligibleCustomers.length === 0 ? (
          <CardContent>
            <Alert>
              <AlertTitle>No active Customers</AlertTitle>
              <AlertDescription>
                Activate a Customer relationship in CRM before creating an order. Customers with incomplete service setup remain visible in New Customer order with their next steps.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intake, pricing, and quotes</CardTitle>
          <CardDescription>
            Active intake includes pricing, quote decisions and held orders. Use All orders for accepted, completed and cancelled records. Laboratory execution continues in Lab operations.
          </CardDescription>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div><Label htmlFor="intake-view">View</Label><select id="intake-view" className="mt-2 block h-9 cursor-pointer rounded-lg border bg-background px-3 text-sm" value={view} onChange={event => setFilters({ intakeView: event.target.value as 'active' | 'holds' | 'all' })}><option value="active">Active intake</option><option value="holds">On hold</option><option value="all">All orders and history</option></select></div>
            <div className="min-w-60 flex-1">
            <Label htmlFor="commercial-intake-search">Search intake</Label>
            <Input
              id="commercial-intake-search"
              className="mt-2"
              value={search}
              onChange={(event) => setFilters({ intakeSearch: event.target.value })}
              placeholder="Order, Job, Company, or request number"
            />
            </div><Button variant="outline" onClick={() => setFilters({ intakeView: 'active', intakeSearch: '', intakePage: 1 })}>Clear filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          {handoffs.error || orders.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Commercial intake could not be loaded</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(handoffs.error ?? orders.error, 'Refresh the intake queue and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          {handoffs.isLoading || orders.isLoading ? <p role="status">Loading commercial intake…</p> : null}
          <div className="divide-y">
            {queueItems.map((item) => item.kind === 'order' ? (
              <CommercialOrderRow
                key={`${item.order.orderType}-${item.order.id}`}
                order={item.order}
                organizationName={organizationNames.get(item.order.organizationId)}
                userId={userId}
              />
            ) : (
              <CrmHandoffRow
                key={item.handoff.handoff.id}
                item={item.handoff}
                onStart={setSelectedHandoff}
              />
            ))}
          </div>
          {orders.data && !orders.isError ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">{orders.data.totalCount} orders · Page {page} of {Math.max(1, Math.ceil(orders.data.totalCount / 25))}{view === 'active' && page === 1 ? ' · Pending CRM handoffs shown separately on this page' : ''}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || orders.isFetching} onClick={() => setFilters({ intakePage: page - 1 })}>Previous</Button><Button variant="outline" disabled={page * 25 >= orders.data.totalCount || orders.isFetching} onClick={() => setFilters({ intakePage: page + 1 })}>Next</Button></div></div> : null}
          {!handoffs.isLoading &&
          !orders.isLoading &&
          !handoffs.isError &&
          !orders.isError &&
          queueItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search.trim() ? 'No intake work matches your search.' : 'No commercial intake work is awaiting action.'}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <LabJobDetailsDialog
        open={createOpen}
        platformOrganizations={eligibleCustomers}
        onOpenChange={setCreateOpen}
        onSaved={async (order) => {
          setCreateOpen(false)
          await refreshIntake()
          await navigate({
            to: '/order-operations/$workflow/$orderId',
            params: { workflow: 'lab', orderId: order.id },
            search: previous => ({ ...previous, orderSection: 'intake' }),
          })
        }}
      />
      <LabJobDetailsDialog
        open={Boolean(selectedHandoff)}
        platformOrganizations={eligibleCustomers}
        sourceHandoff={selectedHandoff?.handoff.organizationId ? {
          requestId: selectedHandoff.handoff.relationshipRequestId,
          requestNumber: selectedHandoff.handoff.requestNumber,
          organizationId: selectedHandoff.handoff.organizationId,
          organizationName: selectedHandoff.organizationName ?? selectedHandoff.companyName,
          companyName: selectedHandoff.companyName,
          opportunityName: selectedHandoff.opportunityName,
        } : null}
        onOpenChange={(open) => { if (!open) setSelectedHandoff(null) }}
        onSaved={async (order) => {
          setSelectedHandoff(null)
          await refreshIntake()
          await navigate({
            to: '/order-operations/$workflow/$orderId',
            params: { workflow: 'lab', orderId: order.id },
            search: previous => ({ ...previous, orderSection: 'intake' }),
          })
        }}
      />
    </div>
  )
}

function CommercialOrderRow({
  order,
  organizationName,
  userId,
}: {
  order: CommercialOrderListItem
  organizationName?: string
  userId: string | null
}) {
  const workflow = workflowForOrderType(order.orderType)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/order-operations/$workflow/$orderId"
            params={{ workflow, orderId: order.id }}
            search={previous => previous}
            className="font-medium text-primary hover:underline"
          >
            {order.reference || order.number}
          </Link>
          <Badge variant="outline">{orderTypeLabel(order.orderType)}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {order.number} · {organizationName ?? order.organizationId} · updated {formatDateTime(order.updatedAt)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {order.assignedToUserId ? order.assignedToUserId === userId ? 'Assigned to you' : 'Assigned' : 'Unassigned'}
          {order.dueAt ? ` · Due ${formatDateTime(order.dueAt)}` : ''}
        </p>
        {order.orderType === 'PSeqLabService' && order.proposedUnitPrice != null ? (
          <p className="mt-1 text-xs font-medium text-foreground">
            Price proposed · {formatMoney(order.proposedUnitPrice, order.proposedCurrency ?? 'USD')} per specimen
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {order.isOverdue ? <span className="text-xs font-medium text-destructive">Overdue</span> : null}
        <OrderStatusBadge status={order.status} />
      </div>
    </div>
  )
}

function CrmHandoffRow({ item, onStart }: { item: CrmOrderHandoff; onStart: (item: CrmOrderHandoff) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.handoff.requestNumber}</span>
          <Badge variant={item.handoff.type === 'PortalEvaluation' || item.handoff.type === 'TrialProject' ? 'secondary' : 'outline'}>
            {item.handoff.type === 'PortalEvaluation' || item.handoff.type === 'TrialProject' ? 'Trial Project · No charge' : 'Sales handoff'}
          </Badge>
          <Badge variant="outline">{formatHandoffStatus(item.handoff.status)}</Badge>
        </div>
        <p className="mt-2 text-sm">{item.companyName}{item.opportunityName ? ` · ${item.opportunityName}` : ''}</p>
        <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          POMS CRM handoff · received {formatDateTime(item.handoff.createdAt)}
        </p>
        {item.handoff.orderBlockingReason ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{item.handoff.orderBlockingReason}</p> : null}
      </div>
      {item.handoff.status === 'PendingReview' ? (
        <Button asChild variant="outline">
          <Link to="/customers" search={{ requestId: item.handoff.relationshipRequestId }}>Open request</Link>
        </Button>
      ) : item.handoff.canStartCustomerOrder && item.handoff.organizationId ? (
        <Button type="button" onClick={() => onStart(item)}>Start Customer order</Button>
      ) : (
        <Button asChild variant="outline"><Link to="/crm/companies">Review Companies in CRM</Link></Button>
      )}
    </div>
  )
}

function intakeSearchText(item: IntakeQueueItem, organizationNames: Map<string, string>) {
  if (item.kind === 'handoff') {
    return [
      item.handoff.handoff.requestNumber,
      item.handoff.companyName,
      item.handoff.organizationName,
      item.handoff.opportunityName,
      item.handoff.summary,
    ].filter(Boolean).join(' ').toLocaleLowerCase()
  }
  return [
    item.order.number,
    item.order.reference,
    organizationNames.get(item.order.organizationId),
    orderTypeLabel(item.order.orderType),
    item.order.status,
  ].filter(Boolean).join(' ').toLocaleLowerCase()
}

function workflowForOrderType(orderType: CommercialOrderListItem['orderType']) {
  if (orderType === 'PSeqKit') return 'reagent' as const
  if (orderType === 'DataAssembly') return 'assembly' as const
  return 'lab' as const
}

function orderTypeLabel(orderType: CommercialOrderListItem['orderType']) {
  if (orderType === 'PSeqKit') return 'PSeq Kit'
  if (orderType === 'DataAssembly') return 'Data Assembly'
  return 'PSeq Lab Service'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

function formatHandoffStatus(value: string) {
  if (value === 'PendingReview') return 'Pending review'
  return value
}
