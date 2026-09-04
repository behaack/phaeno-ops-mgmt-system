import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { listCrmOrderHandoffs, type CrmOrderHandoff } from '#/api/crm'
import {
  getOrderErrorMessage,
  listCommercialOrders,
  listEligibleCustomerCompanies,
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

const activeCommercialStatuses: Record<CommercialOrderListItem['orderType'], ReadonlySet<string>> = {
  PSeqLabService: new Set(['SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued']),
  PSeqKit: new Set(['Placed', 'UnderReview']),
  DataAssembly: new Set(['Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued']),
}

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
  const [search, setSearch] = useState('')
  const customers = useQuery({
    queryKey: ['order-operations', 'eligible-customers'],
    queryFn: listEligibleCustomerCompanies,
    enabled: apiEnabled,
  })
  const handoffs = useQuery({
    queryKey: ['order-intake-handoffs'],
    queryFn: listCrmOrderHandoffs,
    enabled: apiEnabled,
  })
  const orders = useQuery({
    queryKey: ['commercial-orders', 'active-intake'],
    queryFn: () => listCommercialOrders({ activeIntake: true, pageSize: 100 }),
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
        .filter(isActiveCommercialOrder)
        .map((order) => ({ kind: 'order' as const, updatedAt: order.updatedAt, order })) ?? []),
      ...(handoffs.data
        ?.filter((item) => !item.handoff.orderId)
        .map((handoff) => ({ kind: 'handoff' as const, updatedAt: handoff.handoff.createdAt, handoff })) ?? []),
    ]
    items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const term = search.trim().toLocaleLowerCase()
    if (!term) return items
    return items.filter((item) => intakeSearchText(item, organizationNames).includes(term))
  }, [handoffs.data, orders.data?.items, organizationNames, search])

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
                Create Customer work and manage commercial demand through quote acceptance. Authorized laboratory work continues in Lab operations.
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
              <AlertTitle>No eligible Customers</AlertTitle>
              <AlertDescription>
                A Customer needs an active operational scope, ordering authorization, and an active PSeq Lab Service offering before staff can begin pricing. An online administrator is required later, before the quote can be issued.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Intake, pricing, and quotes</CardTitle>
          <CardDescription>
            One active queue for sales handoffs, commercial review, pricing, and Customer quote decisions. Accepted work leaves this queue and continues in Lab operations.
          </CardDescription>
          <div className="mt-3 max-w-md">
            <Label htmlFor="commercial-intake-search">Search intake</Label>
            <Input
              id="commercial-intake-search"
              className="mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, Job, Company, or request number"
            />
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
          })
        }}
      />
    </div>
  )
}

function isActiveCommercialOrder(order: CommercialOrderListItem) {
  return activeCommercialStatuses[order.orderType].has(order.status)
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
