import { CrmProvisioningReturn } from "./CrmListNavigation";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CrmRequestCard } from './CrmRequestCard'

import {
  apiErrorMessage,
  applyRelationshipRequest,
  listOrganizations,
  cancelRelationshipRequest,
  completeRelationshipRequestAccountCreation,
  decideRelationshipRequest,
  listRelationshipRequests,
  listRelationshipRequestHistory,
  type RelationshipRequest,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { CrmListPagination, useCrmSearch } from './CrmListNavigation'

export function CrmPortalAccessPage() {
  const client = useQueryClient()
  const [storedView, setView] = useCrmState<string>('section', 'decision')
  const view = ['decision', 'work', 'history'].includes(storedView) ? storedView : 'decision'
  const [requestId] = useCrmState<string>('requestId', '')
  const [page, setPage] = useCrmState<number>('page', 1)
  const [draftSearch, setDraftSearch, search] = useCrmSearch()
  const organizations = useQuery({ queryKey: ['organizations', 'all'], queryFn: () => listOrganizations(true) })
  const [actionTarget, setActionTarget] = useState<{
    action: RequestAction
    request: RelationshipRequest
  } | null>(null)
  const [recoveryTarget, setRecoveryTarget] =
    useState<RelationshipRequest | null>(null)
  const requests = useQuery({
    queryKey: ['relationship-requests', 'crm-access-review', 'active'],
    queryFn: () => listRelationshipRequests({ activeOnly: true }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: 'always',
  })
  const history = useQuery({
    queryKey: ['relationship-requests', 'crm-access-review', 'history', search, page, requestId],
    queryFn: () => listRelationshipRequestHistory({ search: search || undefined, page, pageSize: 25, requestId: requestId || undefined }),
    enabled: view === 'history' || Boolean(requestId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: 'always',
  })
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['relationship-requests'] }),
      client.invalidateQueries({ queryKey: ['crm-handoffs'] }),
      client.invalidateQueries({ queryKey: ['crm-companies'] }),
      client.invalidateQueries({ queryKey: ['crm-company'] }),
      client.invalidateQueries({ queryKey: ['organizations'] }),
      client.invalidateQueries({ queryKey: ['organization-summary'] }),
      client.invalidateQueries({ queryKey: ['request-completion-readiness'] }),
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
  const reviewQueue = requestId
    ? [...allRequests, ...(history.data?.items ?? [])].filter(request => request.id === requestId)
    : view === 'history' ? history.data?.items ?? []
    : allRequests.filter(request => request.status === (view === 'decision' ? 'PendingReview' : 'Approved'))
  const displayedQuery = view === 'history' || requestId ? history : requests
  const error = displayedQuery.error ?? requests.error


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

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <CardTitle>Company requests</CardTitle>
          <Tabs value={view} onValueChange={setView}><TabsList aria-label="Company request views" className="grid w-full grid-cols-3"><TabsTrigger value="decision">Needs decision ({allRequests.filter(r => r.status === 'PendingReview').length})</TabsTrigger><TabsTrigger value="work">Approved / needs work ({allRequests.filter(r => r.status === 'Approved').length})</TabsTrigger><TabsTrigger value="history">Completed / history</TabsTrigger></TabsList></Tabs>
          <CardDescription>
            Requests originate from their owning Company or Opportunity. Open
            the Company for its full relationship, access, service, and user
            context.
          </CardDescription>
          {view === 'history' ? <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 basis-60"><Label htmlFor="request-history-search">Search completed requests</Label><Input id="request-history-search" className="mt-2" value={draftSearch} onChange={event => setDraftSearch(event.target.value)} disabled={Boolean(requestId)} placeholder="Company, request number, or request details" /></div>
            <CrmClearFilters label="Clear filter" keepVisible />
          </div> : <CrmClearFilters />}
        </CardHeader>
        <CardContent className="p-4">
          {displayedQuery.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading Company requests…
            </p>
          ) : reviewQueue.length ? (
            <div className="space-y-3">
              {reviewQueue.map((request) => (
                <CrmRequestCard
                  key={request.id}
                  request={request}
                  isPending={action.isPending || recovery.isPending}
                  onAction={(nextAction, target) => { action.reset(); setActionTarget({ action: nextAction, request: target }) }}
                  onRecover={setRecoveryTarget}
                />
              ))}
            </div>
          ) : !error ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              {view === 'history' && search ? 'No completed requests match your search.' : 'No Company requests in this view.'}
            </p>
          ) : null}
          {view === 'history' && !error ? <CrmListPagination result={history.data} page={history.data?.page ?? page} onPageChange={setPage} busy={history.isFetching} /> : null}
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
