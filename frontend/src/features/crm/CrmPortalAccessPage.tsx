import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import {
  apiErrorMessage,
  cancelRelationshipRequest,
  completeRelationshipRequestAccountCreation,
  decideRelationshipRequest,
  listRelationshipRequests,
  type RelationshipRequest,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { AccountCreationRecoveryDialog } from '#/features/organizations/AccountCreationRecoveryDialog'
import {
  RequestActionDialog,
  type RequestAction,
} from '#/features/organizations/RequestActionDialog'
import { useState } from 'react'

export function CrmPortalAccessPage() {
  const client = useQueryClient()
  const [actionTarget, setActionTarget] = useState<{
    action: RequestAction
    request: RelationshipRequest
  } | null>(null)
  const [recoveryTarget, setRecoveryTarget] =
    useState<RelationshipRequest | null>(null)
  const requests = useQuery({
    queryKey: ['relationship-requests', 'crm-access-review'],
    queryFn: () => listRelationshipRequests(),
  })
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['relationship-requests'] }),
      client.invalidateQueries({ queryKey: ['crm-handoffs'] }),
      client.invalidateQueries({ queryKey: ['crm-companies'] }),
      client.invalidateQueries({ queryKey: ['crm-company'] }),
      client.invalidateQueries({ queryKey: ['organizations'] }),
    ])
  const action = useMutation({
    mutationFn: ({
      action,
      orderingAuthorized,
      request,
      reason,
    }: {
      action: RequestAction
      orderingAuthorized?: boolean
      request: RelationshipRequest
      reason: string
    }) =>
      action === 'cancel'
        ? cancelRelationshipRequest(request.id, {
            reason,
            version: request.version,
          })
        : decideRelationshipRequest(request.id, {
            approved: action === 'approve',
            reason,
            version: request.version,
            orderingAuthorized,
          }),
    onSuccess: async () => {
      setActionTarget(null)
      await refresh()
    },
  })
  const recovery = useMutation({
    mutationFn: ({
      orderingAuthorized,
      request,
    }: {
      orderingAuthorized: boolean
      request: RelationshipRequest
    }) =>
      completeRelationshipRequestAccountCreation(
        request.id,
        request.version,
        orderingAuthorized,
      ),
    onSuccess: async () => {
      setRecoveryTarget(null)
      await refresh()
    },
  })

  const reviewQueue = (requests.data ?? []).filter(
    (request) =>
      request.source === 'FirstPartyCrm' &&
      (request.status === 'PendingReview' ||
        (request.status === 'Approved' && !request.organizationId)),
  )
  const error = requests.error ?? action.error ?? recovery.error

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="max-w-3xl">
        <Badge variant="secondary" className="mb-3">
          Phaeno CRM
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight">
          Company request review
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Review online access, product and service, relationship, and work
          requests for CRM Companies. Approval never creates a separate
          customer record.
        </p>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not complete the request review</AlertTitle>
          <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Requests originate from their owning Company or Opportunity. Open
            the Company for its full relationship, access, service, and user
            context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading Company requests…
            </p>
          ) : reviewQueue.length ? (
            <div className="space-y-3">
              {reviewQueue.map((request) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {request.companyId ? (
                          <Link
                            to="/crm/companies/$companyId"
                            params={{ companyId: request.companyId }}
                            className="cursor-pointer font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            {request.candidateOrganizationName}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {request.candidateOrganizationName}
                          </span>
                        )}
                        <Badge variant="outline">{request.requestNumber}</Badge>
                        <Badge
                          variant={
                            request.status === 'Approved'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {request.status === 'PendingReview'
                            ? 'Pending review'
                            : request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm">{request.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {spaced(request.requestType)} ·{' '}
                        {request.requestedServices.length
                          ? request.requestedServices
                              .map(serviceLabel)
                              .join(', ')
                          : 'No service change'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {request.status === 'PendingReview' ? (
                        <>
                          <Button
                            size="sm"
                            disabled={action.isPending}
                            onClick={() =>
                              setActionTarget({ action: 'approve', request })
                            }
                          >
                            {enablesAccess(request)
                              ? 'Approve and enable access'
                              : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={action.isPending}
                            onClick={() =>
                              setActionTarget({ action: 'decline', request })
                            }
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          disabled={recovery.isPending}
                          onClick={() => setRecoveryTarget(request)}
                        >
                          Complete access enablement
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          setActionTarget({ action: 'cancel', request })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              No Company requests are waiting for review.
            </p>
          )}
        </CardContent>
      </Card>

      <RequestActionDialog
        action={actionTarget?.action ?? null}
        request={actionTarget?.request ?? null}
        isPending={action.isPending}
        error={action.error ? apiErrorMessage(action.error) : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null)
            action.reset()
          }
        }}
        onSubmit={({ explanation, orderingAuthorized }) => {
          if (actionTarget) {
            action.mutate({
              ...actionTarget,
              orderingAuthorized,
              reason: explanation,
            })
          }
        }}
      />
      <AccountCreationRecoveryDialog
        request={recoveryTarget}
        isPending={recovery.isPending}
        error={recovery.error ? apiErrorMessage(recovery.error) : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setRecoveryTarget(null)
            recovery.reset()
          }
        }}
        onConfirm={(orderingAuthorized) => {
          if (recoveryTarget) {
            recovery.mutate({
              orderingAuthorized,
              request: recoveryTarget,
            })
          }
        }}
      />
    </main>
  )
}

function enablesAccess(request: RelationshipRequest) {
  return (
    !request.organizationId &&
    (request.requestType === 'Onboarding' ||
      request.requestType === 'Evaluation')
  )
}

function serviceLabel(value: string) {
  return value === 'PSeqLabService'
    ? 'PSeq Lab Service'
    : 'PSeq Kit + data assembly'
}

function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}
