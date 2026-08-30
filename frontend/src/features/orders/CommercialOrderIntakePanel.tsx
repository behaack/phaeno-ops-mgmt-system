import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { listCrmOrderHandoffs, type CrmOrderHandoff } from '#/api/crm'
import { getOrderErrorMessage, listEligibleCustomerOrganizations } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { LabJobDetailsDialog } from './LabJobDetailsDialog'

export function CommercialOrderIntakePanel({ apiEnabled, mock }: { apiEnabled: boolean; mock: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedHandoff, setSelectedHandoff] = useState<CrmOrderHandoff | null>(null)
  const customers = useQuery({
    queryKey: ['order-operations', 'eligible-customers'],
    queryFn: listEligibleCustomerOrganizations,
    enabled: apiEnabled,
  })
  const handoffs = useQuery({
    queryKey: ['order-intake-handoffs'],
    queryFn: listCrmOrderHandoffs,
    enabled: apiEnabled,
  })
  const relevantHandoffs = handoffs.data ?? []
  const eligibleCustomers = customers.data ?? []

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Commercial order intake</CardTitle>
              <CardDescription className="mt-1">
                Enter a Customer order or review a sales handoff. Specimen receipt and accession begin later in Lab operations.
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
                A Customer needs ordering authorization, an active PSeq Lab Service offering, and an active administrator before staff can enter its order.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales handoffs awaiting review</CardTitle>
          <CardDescription>
            Closed Won bespoke work and requested Trial Projects still require commercial review. A handoff is not an executable order or Lab work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {handoffs.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Sales handoffs could not be loaded</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(handoffs.error, 'Refresh the intake queue and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          {handoffs.isLoading ? <p role="status">Loading sales handoffs…</p> : null}
          <div className="divide-y">
            {relevantHandoffs.map((item) => (
              <div key={item.handoff.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.handoff.requestNumber}</span>
                    <Badge variant={item.handoff.type === 'PortalEvaluation' || item.handoff.type === 'TrialProject' ? 'secondary' : 'outline'}>
                      {item.handoff.type === 'PortalEvaluation' || item.handoff.type === 'TrialProject' ? 'Trial Project · No charge' : 'Sales-assisted'}
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
                {item.handoff.orderId ? (
                  <Button asChild variant="outline">
                    <Link to="/order-operations/$workflow/$orderId" params={{ workflow: 'lab', orderId: item.handoff.orderId }}>
                      Open {item.handoff.orderNumber ?? 'order'}
                    </Link>
                  </Button>
                ) : item.handoff.canStartCustomerOrder && item.handoff.organizationId ? (
                  <Button type="button" onClick={() => setSelectedHandoff(item)}>Start Customer order</Button>
                ) : (
                  <Button asChild variant="outline"><Link to="/customers">Review in Portal accounts</Link></Button>
                )}
              </div>
            ))}
          </div>
          {!handoffs.isLoading && !relevantHandoffs.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales-assisted order or Trial Project handoffs are awaiting review.</p>
          ) : null}
        </CardContent>
      </Card>

      <LabJobDetailsDialog
        open={createOpen}
        platformOrganizations={eligibleCustomers}
        onOpenChange={setCreateOpen}
        onSaved={async (order) => {
          setCreateOpen(false)
          await queryClient.invalidateQueries({ queryKey: ['commercial-orders'] })
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
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['commercial-orders'] }),
            queryClient.invalidateQueries({ queryKey: ['order-intake-handoffs'] }),
          ])
          await navigate({
            to: '/order-operations/$workflow/$orderId',
            params: { workflow: 'lab', orderId: order.id },
          })
        }}
      />
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatHandoffStatus(value: string) {
  if (value === 'PendingReview') return 'Pending review'
  return value
}
