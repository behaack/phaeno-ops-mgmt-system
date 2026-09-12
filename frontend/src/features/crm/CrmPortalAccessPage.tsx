import { CrmProvisioningReturn } from "./CrmListNavigation";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import {
  apiErrorMessage,
  applyRelationshipRequest,
  listOrganizations,
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
import { useCrmState, CrmClearFilters } from './CrmListNavigation'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

export function CrmPortalAccessPage() {
  const client = useQueryClient()
  const [storedView, setView] = useCrmState<string>('section', 'decision')
  const view = ['decision', 'work', 'history'].includes(storedView) ? storedView : 'decision'
  const [requestId] = useCrmState<string>('requestId', '')
  const organizations = useQuery({ queryKey: ['organizations', 'all'], queryFn: () => listOrganizations(true) })
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
      existingOrganizationId,
      request,
      reason,
      organizationId,
    }: {
      action: RequestAction
      existingOrganizationId?: string
      request: RelationshipRequest
      reason: string
      organizationId?: string
    }) =>
      action === 'apply'
        ? applyRelationshipRequest(request.id, { notes: reason, organizationId, version: request.version })
        : action === 'cancel'
        ? cancelRelationshipRequest(request.id, {
            reason,
            version: request.version,
          })
        : decideRelationshipRequest(request.id, {
            approved: action === 'approve',
            existingOrganizationId,
            reason,
            version: request.version,
          }),
    onSuccess: async () => {
      setActionTarget(null)
      await refresh()
    },
  })
  const recovery = useMutation({
    mutationFn: ({ existingOrganizationId, request }: { existingOrganizationId?: string; request: RelationshipRequest }) =>
      completeRelationshipRequestAccountCreation(
        request.id,
        request.version,
        existingOrganizationId,
      ),
    onSuccess: async () => {
      setRecoveryTarget(null)
      await refresh()
    },
  })

  const allRequests = (requests.data ?? []).filter(request => request.source === 'FirstPartyCrm')
  const reviewQueue = allRequests.filter(request => requestId ? request.id === requestId : view === 'decision'
    ? request.status === 'PendingReview'
    : view === 'work' ? request.status === 'Approved' : !['PendingReview', 'Approved'].includes(request.status))
  const error = requests.error

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <CrmProvisioningReturn />
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
          <CardTitle>Company requests</CardTitle><CrmClearFilters />
          <Tabs value={view} onValueChange={setView}><TabsList className="flex flex-wrap"><TabsTrigger value="decision">Needs decision ({allRequests.filter(r => r.status === 'PendingReview').length})</TabsTrigger><TabsTrigger value="work">Approved / needs work ({allRequests.filter(r => r.status === 'Approved').length})</TabsTrigger><TabsTrigger value="history">Completed / history</TabsTrigger></TabsList></Tabs>
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
                            search={previous => ({ ...previous, section: 'requests' })}
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
                      {request.decisionReason ? <p className="mt-1 text-sm text-muted-foreground">Decision: {request.decisionReason}</p> : null}
                      {request.applicationNotes ? <p className="mt-1 text-sm text-muted-foreground">Completed work: {request.applicationNotes}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {spaced(request.requestType)}{request.requestedOrganizationKind ? ` → ${request.requestedOrganizationKind}` : ''} ·{' '}
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
                      ) : request.status === 'Approved' && enablesAccess(request) ? (
                        <Button
                          size="sm"
                          disabled={recovery.isPending}
                          onClick={() => setRecoveryTarget(request)}
                        >
                          Complete access enablement
                        </Button>
                      ) : request.status === 'Approved' ? <Button size="sm" disabled={action.isPending} onClick={() => { action.reset(); setActionTarget({ action: 'apply', request }) }}>{request.requestType === 'RelationshipChange' ? `Apply ${request.requestedOrganizationKind} relationship` : 'Complete request'}</Button> : null}
                      {request.companyId && request.status === 'Approved' ? <Button asChild size="sm" variant="outline"><Link to="/crm/companies/$companyId" params={{ companyId: request.companyId }} search={previous => ({ ...previous, section: request.requestType === 'Onboarding' || request.requestType === 'Evaluation' ? 'people' : 'departments' })}>Open Company setup</Link></Button> : null}
                      {['PendingReview', 'Approved'].includes(request.status) ? <Button
                        size="sm"
                        variant="outline"
                        disabled={action.isPending}
                        onClick={() =>
                          setActionTarget({ action: 'cancel', request })
                        }
                      >
                        Cancel
                      </Button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !error ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              No Company requests in this view.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <RequestActionDialog
        organizations={organizations.data ?? []}
        action={actionTarget?.action ?? null}
        request={actionTarget?.request ?? null}
        isPending={action.isPending}
        error={action.error}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null)
            action.reset()
          }
        }}
        onSubmit={({ existingOrganizationId, explanation, organizationId }) => {
          if (actionTarget) {
            action.mutate({
              ...actionTarget,
              existingOrganizationId,
              organizationId,
              reason: explanation,
            })
          }
        }}
      />
      <AccountCreationRecoveryDialog
        request={recoveryTarget}
        isPending={recovery.isPending}
        error={recovery.error}
        onOpenChange={(open) => {
          if (!open) {
            setRecoveryTarget(null)
            recovery.reset()
          }
        }}
        onConfirm={(existingOrganizationId) => {
          if (recoveryTarget) {
            recovery.mutate({
              existingOrganizationId,
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
