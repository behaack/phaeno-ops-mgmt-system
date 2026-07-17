import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Pencil, Power, PowerOff, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  apiErrorMessage,
  applyRelationshipRequest,
  cancelRelationshipRequest,
  decideRelationshipRequest,
  listOrganizations,
  listRelationshipRequests,
  setOrganizationActive,
  updateOrganization,
  type Organization,
  type RelationshipRequest,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { LifecycleActionDialog } from './LifecycleActionDialog'
import { OrganizationFormDialog, readinessLabel, type OrganizationFormValues } from './OrganizationFormDialog'
import { RequestActionDialog, type RequestAction } from './RequestActionDialog'

export function OrganizationListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Organization | null>(null)
  const [deactivationTarget, setDeactivationTarget] = useState<Organization | null>(null)
  const [requestActionTarget, setRequestActionTarget] = useState<{
    action: RequestAction
    request: RelationshipRequest
  } | null>(null)

  const organizationsQuery = useQuery({ queryKey: ['organizations', 'all'], queryFn: () => listOrganizations(true) })
  const requestsQuery = useQuery({ queryKey: ['relationship-requests', 'queue'], queryFn: () => listRelationshipRequests() })
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['organizations'] }),
    queryClient.invalidateQueries({ queryKey: ['relationship-requests'] }),
  ])

  const organizationMutation = useMutation({
    mutationFn: (values: OrganizationFormValues) => {
      if (!editing) {
        throw new Error('Select an account before editing it.')
      }

      return updateOrganization(editing.id, { name: values.name, description: values.description || null, portalReadiness: values.portalReadiness, portalReadinessNote: values.portalReadinessNote || null, version: editing.version })
    },
    onSuccess: async () => { await refresh(); setEditing(null) },
  })
  const activeMutation = useMutation({
    mutationFn: ({ organization, active }: { organization: Organization; active: boolean }) => setOrganizationActive(organization.id, active),
    onSuccess: () => { setDeactivationTarget(null); void refresh() },
  })
  const requestAction = useMutation({
    mutationFn: async ({ action, organizationId, request, text }: { action: 'approve' | 'decline' | 'apply' | 'cancel'; organizationId?: string; request: RelationshipRequest; text: string }) => {
      if (action === 'apply') return applyRelationshipRequest(request.id, { notes: text, organizationId, version: request.version })
      if (action === 'cancel') return cancelRelationshipRequest(request.id, { reason: text, version: request.version })
      return decideRelationshipRequest(request.id, { approved: action === 'approve', reason: text, version: request.version })
    },
    onSuccess: () => { setRequestActionTarget(null); void refresh() },
  })

  const externalOrganizations = useMemo(
    () =>
      (organizationsQuery.data ?? []).filter(
        (value) => value.kind !== 'Phaeno',
      ),
    [organizationsQuery.data],
  )
  const visible = useMemo(() => externalOrganizations.filter((value) => {
    const matchesSearch = `${value.name} ${value.description ?? ''} ${value.kind}`.toLowerCase().includes(search.trim().toLowerCase())
    return matchesSearch && (showInactive || value.isActive)
  }), [externalOrganizations, search, showInactive])
  const queue = (requestsQuery.data ?? []).filter((value) => value.status === 'PendingReview' || value.status === 'Approved')
  const error = organizationsQuery.error ?? requestsQuery.error ?? organizationMutation.error ?? activeMutation.error ?? requestAction.error

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <div className="max-w-3xl"><Badge variant="secondary" className="mb-3">Phaeno operations</Badge><h1 className="text-3xl font-semibold leading-tight">Accounts</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Review Prospect, Customer, and Partner accounts, readiness, access, and HubSpot-originated lifecycle requests.</p></div>
      </section>

      {error ? <Alert variant="destructive"><AlertTitle>Could not complete the account action</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle><h2>HubSpot account intake</h2></CardTitle>
            <Badge variant="outline">Not connected</Badge>
          </div>
          <CardDescription>Sales qualifies companies in HubSpot. When an approved evaluation or Closed Won status is ready for handoff, HubSpot will send a pending request to POMS for review. POMS will not activate an account, access, or services automatically.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle><h2>Account directory</h2></CardTitle><CardDescription>The account name opens its dedicated workspace. Relationship type, readiness, access, and service entitlement remain separate controls.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Input aria-label="Search accounts" placeholder="Search accounts" value={search} onChange={(event) => setSearch(event.target.value)} /><label htmlFor="show-inactive-organizations" className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm"><Checkbox id="show-inactive-organizations" checked={showInactive} onCheckedChange={(value) => setShowInactive(value === true)} />Show inactive</label><Button variant="outline" size="icon" aria-label="Refresh accounts" onClick={() => refresh()}><RefreshCw /></Button></div>
          {organizationsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : visible.length ? (
            <div className="divide-y rounded-lg border">
              {visible.map((organization) => <div key={organization.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><Link to="/customers/$customerId" params={{ customerId: organization.id }} className="cursor-pointer font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">{organization.name}</Link><p className="mt-1 text-sm text-muted-foreground">{organization.description || 'No description'}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{organization.kind}</Badge><Badge variant={organization.portalReadiness === 'Ready' ? 'secondary' : 'outline'}>{readinessLabel(organization.portalReadiness)}</Badge>{!organization.isActive ? <Badge variant="destructive">Inactive</Badge> : null}</div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(organization)}><Pencil data-icon="inline-start" />Edit</Button><Button size="sm" variant={organization.isActive ? 'destructive' : 'outline'} disabled={activeMutation.isPending} onClick={() => { if (organization.isActive) setDeactivationTarget(organization); else activeMutation.mutate({ organization, active: true }) }}>{organization.isActive ? <PowerOff data-icon="inline-start" /> : <Power data-icon="inline-start" />}{organization.isActive ? 'Deactivate' : 'Reactivate'}</Button></div></div></div>)}
            </div>
          ) : <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No accounts match the current view.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><h2>Account review queue</h2></CardTitle><CardDescription>HubSpot onboarding, evaluation, account-change, and offboarding requests will appear here for Phaeno review. Existing durable requests remain reviewable while automated intake is not connected.</CardDescription></CardHeader>
        <CardContent>{requestsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : queue.length ? <div className="space-y-3">{queue.map((request) => <RequestRow key={request.id} request={request} disabled={requestAction.isPending} onAction={(action) => setRequestActionTarget({ action, request })} />)}</div> : <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No account requests are waiting for review.</p>}</CardContent>
      </Card>

      <OrganizationFormDialog open={Boolean(editing)} organization={editing} isPending={organizationMutation.isPending} error={organizationMutation.error ? apiErrorMessage(organizationMutation.error) : undefined} onOpenChange={(open) => { if (!open) setEditing(null) }} onSubmit={(values) => organizationMutation.mutate(values)} />
      <RequestActionDialog action={requestActionTarget?.action ?? null} request={requestActionTarget?.request ?? null} organizations={externalOrganizations} isPending={requestAction.isPending} error={requestAction.error ? apiErrorMessage(requestAction.error) : undefined} onOpenChange={(open) => { if (!open) setRequestActionTarget(null) }} onSubmit={({ explanation, organizationId }) => { if (requestActionTarget) requestAction.mutate({ ...requestActionTarget, organizationId, text: explanation }) }} />
      <LifecycleActionDialog
        action={deactivationTarget ? { kind: 'deactivate-organization', organizationName: deactivationTarget.name } : null}
        isPending={activeMutation.isPending}
        error={activeMutation.error ? apiErrorMessage(activeMutation.error) : undefined}
        onOpenChange={(open) => { if (!open) setDeactivationTarget(null) }}
        onConfirm={() => { if (deactivationTarget) activeMutation.mutate({ organization: deactivationTarget, active: false }) }}
      />
    </main>
  )
}

function RequestRow({ disabled, onAction, request }: { disabled: boolean; onAction: (action: RequestAction) => void; request: RelationshipRequest }) {
  return <div className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{request.candidateOrganizationName}</span><Badge variant="outline">{request.requestNumber}</Badge><Badge variant={request.status === 'Approved' ? 'secondary' : 'outline'}>{request.status === 'PendingReview' ? 'Pending review' : request.status}</Badge><Badge variant="outline">{request.source}</Badge></div><p className="mt-2 text-sm">{request.summary}</p><p className="mt-1 text-xs text-muted-foreground">{request.requestType} · {request.requestedServices.length ? request.requestedServices.map(serviceLabel).join(', ') : 'No service change'}</p></div><div className="flex flex-wrap gap-2">{request.status === 'PendingReview' ? <><Button size="sm" disabled={disabled} onClick={() => onAction('approve')}>Approve</Button><Button size="sm" variant="outline" disabled={disabled} onClick={() => onAction('decline')}>Decline</Button></> : <Button size="sm" disabled={disabled} onClick={() => onAction('apply')}>Mark applied</Button>}<Button size="sm" variant="outline" disabled={disabled} onClick={() => onAction('cancel')}>Cancel</Button></div></div></div>
}

export function serviceLabel(value: string) { return value === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit + data assembly' }
