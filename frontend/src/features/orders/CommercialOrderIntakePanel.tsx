import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { getOrderErrorMessage, listEligibleCustomerOrganizations } from '#/api/order-management'
import { listRelationshipRequests } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { LabJobDetailsDialog } from './LabJobDetailsDialog'

export function CommercialOrderIntakePanel({ apiEnabled, mock }: { apiEnabled: boolean; mock: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const customers = useQuery({
    queryKey: ['order-operations', 'eligible-customers'],
    queryFn: listEligibleCustomerOrganizations,
    enabled: apiEnabled,
  })
  const handoffs = useQuery({
    queryKey: ['order-intake-handoffs'],
    queryFn: () => listRelationshipRequests(),
    enabled: apiEnabled,
  })
  const relevantHandoffs = (handoffs.data ?? []).filter((item) =>
    item.source === 'FirstPartyCrm'
    && (item.requestType === 'SalesAssistedOrder' || item.requestType === 'Evaluation')
    && (item.status === 'PendingReview' || item.status === 'Approved'))
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
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.requestNumber}</span>
                    <Badge variant={item.requestType === 'Evaluation' ? 'secondary' : 'outline'}>
                      {item.requestType === 'Evaluation' ? 'Trial Project · No charge' : 'Sales-assisted'}
                    </Badge>
                    <Badge variant="outline">{item.status === 'PendingReview' ? 'Pending review' : 'Approved'}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{item.candidateOrganizationName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSourceReference(item.sourceReference)} · received {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Button asChild variant="outline"><Link to="/customers">Review in Portal accounts</Link></Button>
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
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatSourceReference(value: string | null) {
  return value?.startsWith('first-party-crm:') ? 'POMS CRM handoff' : value ?? 'CRM source reference unavailable'
}
