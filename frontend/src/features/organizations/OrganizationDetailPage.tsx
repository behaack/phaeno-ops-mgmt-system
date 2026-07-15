import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ClipboardList, Pencil, Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  apiErrorMessage,
  applyRelationshipRequest,
  convertProspect,
  createEntitlement,
  createInvitation,
  createRelationshipRequest,
  deactivateMembership,
  decideRelationshipRequest,
  endEntitlement,
  getOrganization,
  getOrganizationSummary,
  listEntitlements,
  listInvitations,
  listOrganizationUsers,
  listRelationshipRequests,
  revokeInvitation,
  updateMembershipRole,
  updateOrganization,
  type RelationshipRequest,
  type ServiceEntitlement,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { EntitlementDialog, type EntitlementFormValues } from './EntitlementDialog'
import { LifecycleActionDialog, type LifecycleAction } from './LifecycleActionDialog'
import { OrganizationFormDialog, readinessLabel, type OrganizationFormValues } from './OrganizationFormDialog'
import { OrganizationConversionDialog } from './OrganizationConversionDialog'
import { RelationshipRequestDialog, requestedServices, type RelationshipRequestFormValues } from './RelationshipRequestDialog'
import { serviceLabel } from './OrganizationListPage'
import { RequestActionDialog, type RequestAction } from './RequestActionDialog'

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const client = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [entitlementOpen, setEntitlementOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [conversionTarget, setConversionTarget] = useState<'Customer' | 'Partner' | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<DetailLifecycleTarget>(null)
  const [requestActionTarget, setRequestActionTarget] = useState<{
    action: RequestAction
    request: RelationshipRequest
  } | null>(null)
  const organizationQuery = useQuery({ queryKey: ['organization', organizationId], queryFn: () => getOrganization(organizationId) })
  const summaryQuery = useQuery({ queryKey: ['organization-summary', organizationId], queryFn: () => getOrganizationSummary(organizationId) })
  const usersQuery = useQuery({ queryKey: ['organization-users', organizationId], queryFn: () => listOrganizationUsers(organizationId) })
  const invitationsQuery = useQuery({ queryKey: ['organization-invitations', organizationId], queryFn: () => listInvitations(organizationId) })
  const entitlementsQuery = useQuery({ queryKey: ['organization-entitlements', organizationId], queryFn: () => listEntitlements(organizationId) })
  const requestsQuery = useQuery({ queryKey: ['relationship-requests', organizationId], queryFn: () => listRelationshipRequests({ organizationId }) })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-summary', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-invitations', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-entitlements', organizationId] }),
    client.invalidateQueries({ queryKey: ['relationship-requests'] }),
    client.invalidateQueries({ queryKey: ['organizations'] }),
  ])
  const organization = organizationQuery.data

  const editMutation = useMutation({ mutationFn: (values: OrganizationFormValues) => updateOrganization(organizationId, { name: values.name, description: values.description || null, portalReadiness: values.portalReadiness, portalReadinessNote: values.portalReadinessNote || null, version: organization!.version }), onSuccess: async () => { await refresh(); setEditOpen(false) } })
  const conversionMutation = useMutation({ mutationFn: (kind: 'Customer' | 'Partner') => convertProspect(organizationId, kind, organization!.version), onSuccess: () => { setConversionTarget(null); void refresh() } })
  const inviteMutation = useMutation({ mutationFn: (values: InviteValues) => createInvitation({ organizationId, email: values.email, isOrganizationAdmin: values.role === 'Administrator' }), onSuccess: async () => { await refresh(); setInviteOpen(false) } })
  const memberMutation = useMutation({ mutationFn: async ({ membershipId, action, isAdmin }: { membershipId: string; action: 'role' | 'deactivate'; isAdmin?: boolean }) => action === 'role' ? updateMembershipRole(membershipId, Boolean(isAdmin)) : deactivateMembership(membershipId), onSuccess: () => { setLifecycleTarget(null); void refresh() } })
  const inviteAction = useMutation({ mutationFn: revokeInvitation, onSuccess: refresh })
  const entitlementMutation = useMutation({ mutationFn: (values: EntitlementFormValues) => createEntitlement(organizationId, { service: values.service, effectiveFrom: new Date(values.effectiveFrom).toISOString(), effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null, configurationStatus: values.configurationStatus, sourceRequestId: values.sourceRequestId || null, notes: values.notes || null }), onSuccess: async () => { await refresh(); setEntitlementOpen(false) } })
  const endMutation = useMutation({ mutationFn: ({ entitlement, reason }: { entitlement: ServiceEntitlement; reason: string }) => endEntitlement(organizationId, entitlement.id, { effectiveTo: new Date().toISOString(), reason, version: entitlement.version }), onSuccess: () => { setLifecycleTarget(null); void refresh() } })
  const requestMutation = useMutation({ mutationFn: (values: RelationshipRequestFormValues) => createRelationshipRequest({ organizationId, candidateOrganizationName: null, requestType: values.requestType, requestedOrganizationKind: values.requestedOrganizationKind, sourceReference: values.sourceReference || null, summary: values.summary, internalNotes: values.internalNotes || null, requestedServices: requestedServices(values) }), onSuccess: async () => { await refresh(); setRequestOpen(false) } })
  const requestAction = useMutation({ mutationFn: ({ request, action, text }: { request: RelationshipRequest; action: RequestAction; text: string }) => action === 'apply' ? applyRelationshipRequest(request.id, { notes: text, version: request.version }) : decideRelationshipRequest(request.id, { approved: action === 'approve', reason: text, version: request.version }), onSuccess: () => { setRequestActionTarget(null); void refresh() } })

  const error = organizationQuery.error ?? summaryQuery.error ?? usersQuery.error ?? invitationsQuery.error ?? entitlementsQuery.error ?? requestsQuery.error ?? editMutation.error ?? conversionMutation.error ?? inviteMutation.error ?? memberMutation.error ?? inviteAction.error ?? entitlementMutation.error ?? endMutation.error ?? requestMutation.error ?? requestAction.error
  if (organizationQuery.isLoading) return <main className="page-wrap px-4 py-8"><p className="text-sm text-muted-foreground">Loading organization…</p></main>
  if (!organization) return <NotFound />

  const summary = summaryQuery.data
  const pendingInvitations = (invitationsQuery.data ?? []).filter((value) => value.status === 'Pending')
  const lifecycleAction: LifecycleAction | null = lifecycleTarget?.kind === 'member'
    ? { kind: 'deactivate-member', memberEmail: lifecycleTarget.email, organizationName: organization.name }
    : lifecycleTarget?.kind === 'entitlement'
      ? { kind: 'end-entitlement', serviceName: serviceLabel(lifecycleTarget.entitlement.service), organizationName: organization.name }
      : null
  const lifecyclePending = lifecycleTarget?.kind === 'member' ? memberMutation.isPending : endMutation.isPending
  const lifecycleError = lifecycleTarget?.kind === 'member' ? memberMutation.error : endMutation.error
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Badge variant="secondary" className="mb-3">{organization.kind}</Badge><h1 className="text-3xl font-semibold leading-tight">{organization.name}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{organization.description || 'No organization description has been recorded.'}</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/customers"><ArrowLeft data-icon="inline-start" />Back to organizations</Link></Button><Button variant="outline" onClick={() => setRequestOpen(true)}><ClipboardList data-icon="inline-start" />New request</Button><Button onClick={() => setEditOpen(true)}><Pencil data-icon="inline-start" />Edit</Button></div></section>
      {error ? <Alert variant="destructive"><AlertTitle>Could not complete the organization action</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Portal readiness" value={readinessLabel(organization.portalReadiness)} /><Summary label="Administrator" value={summary?.administratorStatus ?? 'Loading'} /><Summary label="Active members" value={`${summary?.activeMemberCount ?? 0}`} /><Summary label="Usable services" value={`${summary?.effectiveServices.length ?? 0}`} /></section>

      <Card><CardContent className="pt-6"><Tabs defaultValue="overview"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="services">Services</TabsTrigger><TabsTrigger value="requests">Requests</TabsTrigger></TabsList>
        <TabsContent value="overview" className="mt-5 space-y-4"><div className="grid gap-4 md:grid-cols-2"><Info label="Relationship type" value={organization.kind} /><Info label="Status" value={organization.isActive ? 'Active' : 'Inactive'} /><Info label="Portal readiness" value={readinessLabel(organization.portalReadiness)} /><Info label="Pending requests" value={`${summary?.pendingRequestCount ?? 0}`} /></div><div className="rounded-lg border p-4"><h2 className="font-medium">Readiness note</h2><p className="mt-2 text-sm text-muted-foreground">{organization.portalReadinessNote || 'No readiness note recorded.'}</p></div>{organization.kind === 'Prospect' ? <div className="rounded-lg border p-4"><h2 className="font-medium">Convert qualified prospect</h2><p className="mt-1 text-sm text-muted-foreground">Conversion changes the relationship type only. Access, invitations, and services remain explicit.</p><div className="mt-3 flex gap-2"><Button size="sm" disabled={conversionMutation.isPending} onClick={() => setConversionTarget('Customer')}>Convert to customer</Button><Button size="sm" variant="outline" disabled={conversionMutation.isPending} onClick={() => setConversionTarget('Partner')}>Convert to partner</Button></div></div> : null}</TabsContent>
        <TabsContent value="members" className="mt-5 space-y-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-medium">Members and invitations</h2><p className="text-sm text-muted-foreground">A ready organization still needs an active administrator or invitation.</p></div><Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus data-icon="inline-start" />Invite user</Button></div><div className="space-y-3">{(usersQuery.data ?? []).map((user) => { const membership = user.memberships.find((value) => value.organizationId === organizationId); if (!membership) return null; return <div key={user.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{user.firstName} {user.lastName}</p><p className="text-sm text-muted-foreground">{user.email} · {membership.isOrganizationAdmin ? 'Administrator' : 'Member'} · {membership.isActive ? user.status : 'Membership inactive'}</p></div><div className="flex gap-2">{membership.isActive ? <><Button size="sm" variant="outline" disabled={memberMutation.isPending} onClick={() => memberMutation.mutate({ membershipId: membership.id, action: 'role', isAdmin: !membership.isOrganizationAdmin })}>{membership.isOrganizationAdmin ? 'Make member' : 'Make admin'}</Button><Button size="sm" variant="destructive" disabled={memberMutation.isPending} onClick={() => setLifecycleTarget({ kind: 'member', membershipId: membership.id, email: user.email })}>Deactivate</Button></> : null}</div></div> })}{!usersQuery.isLoading && !(usersQuery.data ?? []).length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No members yet.</p> : null}</div><div><h3 className="mb-3 font-medium">Pending invitations</h3><div className="space-y-2">{pendingInvitations.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{invite.email}</p><p className="text-xs text-muted-foreground">{invite.isOrganizationAdmin ? 'Administrator' : 'Member'} · expires {formatDate(invite.expiresAt)}</p></div><Button size="sm" variant="outline" disabled={inviteAction.isPending} onClick={() => inviteAction.mutate(invite.id)}>Revoke</Button></div>)}{!pendingInvitations.length ? <p className="text-sm text-muted-foreground">No pending invitations.</p> : null}</div></div></TabsContent>
        <TabsContent value="services" className="mt-5 space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-medium">Service entitlements</h2><p className="text-sm text-muted-foreground">PSeq Kit always includes its data-assembly phase; it is not a separate entitlement.</p></div>{organization.kind === 'Customer' || organization.kind === 'Partner' ? <Button size="sm" onClick={() => setEntitlementOpen(true)}><Plus data-icon="inline-start" />Add entitlement</Button> : null}</div><div className="space-y-3">{(entitlementsQuery.data ?? []).map((value) => <div key={value.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="font-medium">{serviceLabel(value.service)}</span><Badge variant={value.isUsable ? 'secondary' : 'outline'}>{value.endReason ? 'Ended' : value.isUsable ? 'Usable' : value.configurationStatus}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{formatDate(value.effectiveFrom)} to {value.effectiveTo ? formatDate(value.effectiveTo) : 'open ended'}</p>{value.notes ? <p className="mt-1 text-sm">{value.notes}</p> : null}{value.endReason ? <p className="mt-1 text-sm text-muted-foreground">Ended: {value.endReason}</p> : null}</div>{value.isEffective ? <Button size="sm" variant="outline" disabled={endMutation.isPending} onClick={() => setLifecycleTarget({ kind: 'entitlement', entitlement: value })}>End now</Button> : null}</div>)}{!entitlementsQuery.isLoading && !(entitlementsQuery.data ?? []).length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No service entitlements recorded.</p> : null}</div></TabsContent>
        <TabsContent value="requests" className="mt-5 space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-medium">Portal request history</h2><p className="text-sm text-muted-foreground">Requests are the handoff record between HubSpot/manual intake and Portal operations.</p></div><Button size="sm" onClick={() => setRequestOpen(true)}><Plus data-icon="inline-start" />New request</Button></div><div className="space-y-3">{(requestsQuery.data ?? []).map((request) => <div key={request.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="font-medium">{request.requestNumber}</span><Badge variant="outline">{request.status}</Badge><Badge variant="outline">{request.source}</Badge></div><p className="mt-2 text-sm">{request.summary}</p><p className="mt-1 text-xs text-muted-foreground">{request.requestType} · {formatDate(request.createdAt)}</p></div><div className="flex gap-2">{request.status === 'PendingReview' ? <><Button size="sm" disabled={requestAction.isPending} onClick={() => setRequestActionTarget({ action: 'approve', request })}>Approve</Button><Button size="sm" variant="outline" disabled={requestAction.isPending} onClick={() => setRequestActionTarget({ action: 'decline', request })}>Decline</Button></> : request.status === 'Approved' ? <Button size="sm" disabled={requestAction.isPending} onClick={() => setRequestActionTarget({ action: 'apply', request })}>Mark applied</Button> : null}</div></div></div>)}{!requestsQuery.isLoading && !(requestsQuery.data ?? []).length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No requests recorded for this organization.</p> : null}</div></TabsContent>
      </Tabs></CardContent></Card>

      <OrganizationFormDialog open={editOpen} organization={organization} isPending={editMutation.isPending} error={editMutation.error ? apiErrorMessage(editMutation.error) : undefined} onOpenChange={setEditOpen} onSubmit={(values) => editMutation.mutate(values)} />
      <OrganizationConversionDialog organization={organization} targetKind={conversionTarget} isPending={conversionMutation.isPending} error={conversionMutation.error ? apiErrorMessage(conversionMutation.error) : undefined} onOpenChange={(open) => { if (!open) setConversionTarget(null) }} onConfirm={() => { if (conversionTarget) conversionMutation.mutate(conversionTarget) }} />
      <InviteDialog open={inviteOpen} isPending={inviteMutation.isPending} error={inviteMutation.error ? apiErrorMessage(inviteMutation.error) : undefined} onOpenChange={setInviteOpen} onSubmit={(values) => inviteMutation.mutate(values)} />
      <EntitlementDialog open={entitlementOpen} organization={organization} requests={requestsQuery.data ?? []} isPending={entitlementMutation.isPending} error={entitlementMutation.error ? apiErrorMessage(entitlementMutation.error) : undefined} onOpenChange={setEntitlementOpen} onSubmit={(values) => entitlementMutation.mutate(values)} />
      <RelationshipRequestDialog open={requestOpen} organization={organization} isPending={requestMutation.isPending} error={requestMutation.error ? apiErrorMessage(requestMutation.error) : undefined} onOpenChange={setRequestOpen} onSubmit={(values) => requestMutation.mutate(values)} />
      <RequestActionDialog action={requestActionTarget?.action ?? null} request={requestActionTarget?.request ?? null} isPending={requestAction.isPending} error={requestAction.error ? apiErrorMessage(requestAction.error) : undefined} onOpenChange={(open) => { if (!open) setRequestActionTarget(null) }} onSubmit={({ explanation }) => { if (requestActionTarget) requestAction.mutate({ ...requestActionTarget, text: explanation }) }} />
      <LifecycleActionDialog
        action={lifecycleAction}
        isPending={lifecyclePending}
        error={lifecycleError ? apiErrorMessage(lifecycleError) : undefined}
        onOpenChange={(open) => { if (!open) setLifecycleTarget(null) }}
        onConfirm={(reason) => {
          if (lifecycleTarget?.kind === 'member') memberMutation.mutate({ membershipId: lifecycleTarget.membershipId, action: 'deactivate' })
          if (lifecycleTarget?.kind === 'entitlement' && reason) endMutation.mutate({ entitlement: lifecycleTarget.entitlement, reason })
        }}
      />
    </main>
  )

}

type DetailLifecycleTarget =
  | { kind: 'member'; membershipId: string; email: string }
  | { kind: 'entitlement'; entitlement: ServiceEntitlement }
  | null

const inviteSchema = z.object({ email: z.string().trim().email('Enter a valid email address.'), role: z.enum(['Administrator', 'Member']) })
type InviteValues = z.infer<typeof inviteSchema>
function InviteDialog({ error, isPending, onOpenChange, onSubmit, open }: { error?: string; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: InviteValues) => void; open: boolean }) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', role: 'Member' } })
  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) form.reset() }}><DialogContent><DialogHeader><DialogTitle>Invite organization user</DialogTitle><DialogDescription>The invitation creates or reactivates membership only after the recipient accepts it.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="invite-user" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><div className="grid gap-1.5"><Label htmlFor="invite-email">Email <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label><Input id="invite-email" type="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />{form.formState.errors.email ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.email.message}</p> : null}</div><div className="grid gap-1.5"><Label htmlFor="invite-role">Role</Label><select id="invite-role" className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('role')}><option value="Member">Member</option><option value="Administrator">Organization administrator</option></select></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="invite-user" disabled={isPending}>{isPending ? 'Sending…' : 'Send invitation'}</Button></DialogFooter></DialogContent></Dialog>
}

function Summary({ label, value }: { label: string; value: string }) { return <Card size="sm"><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-lg font-semibold">{value}</p></CardContent></Card> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border p-4"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) }
function NotFound() { return <main className="page-wrap px-4 py-8"><Card className="max-w-2xl"><CardHeader><CardTitle>Organization not found</CardTitle><CardDescription>The selected organization could not be loaded.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/customers"><ArrowLeft data-icon="inline-start" />Back to organizations</Link></Button></CardContent></Card></main> }
