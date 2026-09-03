import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Copy, Pencil, Plus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  apiErrorMessage,
  convertProspect,
  createDevelopmentInvitationLink,
  createEntitlement,
  createInvitation,
  deactivateMembership,
  endEntitlement,
  getOrganization,
  getOperationalReadiness,
  getOrganizationSummary,
  listEntitlements,
  listInvitations,
  listOrganizationUsers,
  listRelationshipRequests,
  revokeInvitation,
  resendInvitation,
  updateEntitlement,
  updateMembershipRole,
  updateOrganization,
  type DevelopmentInvitationLink,
  type ServiceEntitlement,
  type Invitation,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { OrganizationRetentionPolicyPanel } from '#/features/file-management/OrganizationRetentionPolicyPanel'
import { EntitlementDialog, type EntitlementFormValues } from './EntitlementDialog'
import { EditEntitlementDialog, type EditEntitlementFormValues } from './EditEntitlementDialog'
import { LifecycleActionDialog, type LifecycleAction } from './LifecycleActionDialog'
import { OrganizationFormDialog, readinessLabel, type OrganizationFormValues } from './OrganizationFormDialog'
import { OrganizationConversionDialog } from './OrganizationConversionDialog'

export function OrganizationDetailPage({
  organizationId,
  embedded = false,
}: {
  organizationId: string
  embedded?: boolean
}) {
  const { session } = usePhaenoSession()
  const client = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [entitlementOpen, setEntitlementOpen] = useState(false)
  const [entitlementEditTarget, setEntitlementEditTarget] = useState<ServiceEntitlement | null>(null)
  const [conversionTarget, setConversionTarget] = useState<'Customer' | 'Partner' | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<DetailLifecycleTarget>(null)
  const [developmentInviteLink, setDevelopmentInviteLink] = useState<DevelopmentInvitationLink | null>(null)
  const organizationQuery = useQuery({ queryKey: ['organization', organizationId], queryFn: () => getOrganization(organizationId) })
  const summaryQuery = useQuery({ queryKey: ['organization-summary', organizationId], queryFn: () => getOrganizationSummary(organizationId) })
  const readinessQuery = useQuery({
    queryKey: ['organization-operational-readiness', organizationId],
    queryFn: () => getOperationalReadiness(organizationId),
    enabled: organizationQuery.data?.kind === 'Customer',
  })
  const usersQuery = useQuery({ queryKey: ['organization-users', organizationId], queryFn: () => listOrganizationUsers(organizationId) })
  const invitationsQuery = useQuery({ queryKey: ['organization-invitations', organizationId], queryFn: () => listInvitations(organizationId) })
  const entitlementsQuery = useQuery({ queryKey: ['organization-entitlements', organizationId], queryFn: () => listEntitlements(organizationId) })
  const requestsQuery = useQuery({ queryKey: ['relationship-requests', organizationId], queryFn: () => listRelationshipRequests({ organizationId }) })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-summary', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-operational-readiness', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-invitations', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-entitlements', organizationId] }),
    client.invalidateQueries({ queryKey: ['relationship-requests'] }),
    client.invalidateQueries({ queryKey: ['organizations'] }),
  ])
  const organization = organizationQuery.data

  const editMutation = useMutation({ mutationFn: (values: OrganizationFormValues) => updateOrganization(organizationId, { name: values.name, description: values.description || null, portalReadiness: values.portalReadiness, portalReadinessNote: values.portalReadinessNote || null, version: organization!.version }), onSuccess: async () => { await refresh(); setEditOpen(false) } })
  const conversionMutation = useMutation({ mutationFn: (kind: 'Customer' | 'Partner') => convertProspect(organizationId, kind, organization!.version), onSuccess: () => { setConversionTarget(null); void refresh() } })
  const inviteMutation = useMutation({ mutationFn: (values: InviteValues) => createInvitation({ organizationId, firstName: values.firstName, lastName: values.lastName, email: values.email, isOrganizationAdmin: values.role === 'Administrator', labRoles: [], businessRoles: [] }), onSuccess: async () => { await refresh(); setInviteOpen(false) } })
  const memberMutation = useMutation({ mutationFn: async ({ membershipId, action, isAdmin }: { membershipId: string; action: 'role' | 'deactivate'; isAdmin?: boolean }) => action === 'role' ? updateMembershipRole(membershipId, Boolean(isAdmin)) : deactivateMembership(membershipId), onSuccess: () => { setLifecycleTarget(null); void refresh() } })
  const inviteAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resend' | 'revoke' }) =>
      action === 'resend' ? resendInvitation(id) : revokeInvitation(id),
    onSuccess: refresh,
  })
  const developmentLinkMutation = useMutation({ mutationFn: createDevelopmentInvitationLink, onSuccess: async (result) => { setDevelopmentInviteLink(result); await client.invalidateQueries({ queryKey: ['organization-invitations', organizationId] }) } })
  const entitlementMutation = useMutation({ mutationFn: (values: EntitlementFormValues) => createEntitlement(organizationId, { service: values.service, effectiveFrom: new Date(values.effectiveFrom).toISOString(), effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null, configurationStatus: values.configurationStatus, sourceRequestId: values.sourceRequestId || null, notes: values.notes || null }), onSuccess: async () => { await refresh(); setEntitlementOpen(false) } })
  const editEntitlementMutation = useMutation({ mutationFn: ({ entitlement, values }: { entitlement: ServiceEntitlement; values: EditEntitlementFormValues }) => updateEntitlement(organizationId, entitlement.id, { effectiveFrom: new Date(values.effectiveFrom).toISOString(), effectiveTo: values.effectiveTo ? new Date(values.effectiveTo).toISOString() : null, configurationStatus: values.configurationStatus, sourceRequestId: values.sourceRequestId || null, notes: values.notes || null, version: entitlement.version }), onSuccess: async () => { await refresh(); setEntitlementEditTarget(null) } })
  const endMutation = useMutation({ mutationFn: ({ entitlement, reason }: { entitlement: ServiceEntitlement; reason: string }) => endEntitlement(organizationId, entitlement.id, { effectiveTo: new Date().toISOString(), reason, version: entitlement.version }), onSuccess: () => { setLifecycleTarget(null); void refresh() } })

  const errorState = [
    { label: 'Portal access details', error: organizationQuery.error },
    { label: 'Portal access summary', error: summaryQuery.error },
    { label: 'Operational readiness', error: readinessQuery.error },
    { label: 'Portal users', error: usersQuery.error },
    { label: 'Invitations', error: invitationsQuery.error },
    { label: 'Service entitlements', error: entitlementsQuery.error },
    { label: 'Company requests', error: requestsQuery.error },
    { label: 'Portal access action', error: editMutation.error ?? conversionMutation.error ?? inviteMutation.error ?? memberMutation.error ?? inviteAction.error ?? developmentLinkMutation.error ?? entitlementMutation.error ?? editEntitlementMutation.error ?? endMutation.error },
  ].find((item) => item.error)
  if (organizationQuery.isLoading) return <div className={embedded ? '' : 'page-wrap px-4 py-8'}><p className="text-sm text-muted-foreground">Loading Portal access…</p></div>
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
  const Root = embedded ? 'section' : 'main'
  return (
    <Root className={embedded ? 'space-y-6' : 'page-wrap space-y-6 px-4 py-8'}>
      {embedded ? (
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="secondary">Portal access enabled</Badge>
              <Badge variant="outline">{organization.kind}</Badge>
            </div>
            <h2 className="text-xl font-semibold">Portal access and services</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage this Company&apos;s users, invitations, service authorization, readiness, and retention.
            </p>
          </div>
          <Button variant="outline" onClick={() => setActiveTab('members')}><Users data-icon="inline-start" />Manage users</Button>
        </section>
      ) : (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Badge variant="secondary" className="mb-3">{organization.kind}</Badge><h1 className="text-3xl font-semibold leading-tight">{organization.name}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{organization.description || 'No account description has been recorded.'}</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/crm/companies"><ArrowLeft data-icon="inline-start" />Back to Companies</Link></Button><Button variant="outline" onClick={() => setActiveTab('members')}><Users data-icon="inline-start" />Manage users</Button><Button onClick={() => setEditOpen(true)}><Pencil data-icon="inline-start" />Edit access settings</Button></div></section>
      )}
      {errorState ? <Alert variant="destructive"><AlertTitle>{errorState.label} could not be loaded</AlertTitle><AlertDescription>{apiErrorMessage(errorState.error)}</AlertDescription></Alert> : null}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Operational readiness" value={readinessQuery.isLoading ? 'Checking…' : readinessQuery.data?.state ?? 'Not applicable'} /><Summary label="Administrator" value={summary?.administratorStatus ?? 'Loading'} /><Summary label="Active users" value={`${summary?.activeMemberCount ?? 0}`} /><Summary label="Usable services" value={`${summary?.effectiveServices.length ?? 0}`} /></section>

      <Card><CardContent className="pt-6"><Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="members">Users</TabsTrigger><TabsTrigger value="services">Services</TabsTrigger><TabsTrigger value="retention">Retention</TabsTrigger></TabsList>
        <TabsContent value="overview" className="mt-5 space-y-4"><div className="grid gap-4 md:grid-cols-2"><Info label="Portal relationship" value={organization.kind} /><Info label="Access status" value={organization.isActive ? 'Enabled' : 'Suspended'} /><Info label="Setup readiness" value={readinessLabel(organization.portalReadiness)} /><Info label="Pending requests" value={`${summary?.pendingRequestCount ?? 0}`} /></div>{organization.kind === 'Customer' ? <ReadinessChecklist readiness={readinessQuery.data} isLoading={readinessQuery.isLoading} isStale={readinessQuery.isStale} /> : null}<div className="rounded-lg border p-4"><h2 className="font-medium">Readiness note</h2><p className="mt-2 text-sm text-muted-foreground">{organization.portalReadinessNote || 'No readiness note recorded. It does not authorize transactions.'}</p></div>{!embedded && organization.kind === 'Prospect' ? <div className="rounded-lg border p-4"><h2 className="font-medium">Convert qualified prospect</h2><p className="mt-1 text-sm text-muted-foreground">Conversion changes the relationship type only. Access, invitations, and services remain explicit.</p><div className="mt-3 flex gap-2"><Button size="sm" disabled={conversionMutation.isPending} onClick={() => setConversionTarget('Customer')}>Convert to customer</Button><Button size="sm" variant="outline" disabled={conversionMutation.isPending} onClick={() => setConversionTarget('Partner')}>Convert to partner</Button></div></div> : null}</TabsContent>
        <TabsContent value="members" className="mt-5 space-y-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-medium">Portal users and invitations</h2><p className="text-sm text-muted-foreground">Only a Phaeno-reviewed Portal invitation grants access. Email delivery is tracked separately from invitation access.</p></div><Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus data-icon="inline-start" />Invite user</Button></div><div className="space-y-3">{(usersQuery.data ?? []).map((user) => { const membership = user.memberships.find((value) => value.organizationId === organizationId); if (!membership) return null; return <div key={user.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{user.firstName} {user.lastName}</p><p className="text-sm text-muted-foreground">{user.email} · {membership.isOrganizationAdmin ? 'Administrator' : 'Member'} · {membership.isActive ? user.status : 'Membership inactive'}</p></div><div className="flex gap-2">{membership.isActive ? <><Button size="sm" variant="outline" disabled={memberMutation.isPending} onClick={() => memberMutation.mutate({ membershipId: membership.id, action: 'role', isAdmin: !membership.isOrganizationAdmin })}>{membership.isOrganizationAdmin ? 'Make member' : 'Make admin'}</Button>{user.id !== session?.user?.id ? <Button size="sm" variant="destructive" disabled={memberMutation.isPending} onClick={() => setLifecycleTarget({ kind: 'member', membershipId: membership.id, email: user.email })}>Deactivate</Button> : null}</> : null}</div></div> })}{!usersQuery.isLoading && !(usersQuery.data ?? []).length ? <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">No Portal users yet.</p> : null}</div><div><h3 className="mb-3 font-medium">Pending invitations</h3><div className="space-y-2">{pendingInvitations.map((invite) => <InvitationRow key={invite.id} invitation={invite} isPending={inviteAction.isPending || developmentLinkMutation.isPending} onAction={(action) => inviteAction.mutate({ id: invite.id, action })} onDevelopmentLink={import.meta.env.DEV ? () => developmentLinkMutation.mutate(invite.id) : undefined} />)}{invitationsQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking invitation delivery…</p> : null}{!invitationsQuery.isLoading && !pendingInvitations.length ? <p className="text-sm text-muted-foreground">No pending invitations.</p> : null}</div></div></TabsContent>
        <TabsContent value="services" className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Service entitlements</h2>
              <p className="text-sm text-muted-foreground">
                PSeq Kit always includes its data-assembly phase; it is not a
                separate entitlement.
              </p>
            </div>
            {organization.kind === 'Customer' || organization.kind === 'Partner' ? (
              <Button size="sm" onClick={() => setEntitlementOpen(true)}>
                <Plus data-icon="inline-start" />
                Add entitlement
              </Button>
            ) : null}
          </div>
          <div className="space-y-3">
            {(entitlementsQuery.data ?? []).map((value) => (
              <div
                key={value.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="font-medium">{serviceLabel(value.service)}</span>
                    <Badge variant={value.isUsable ? 'secondary' : 'outline'}>
                      {value.endReason
                        ? 'Ended'
                        : `Service configuration: ${value.configurationStatus}`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDate(value.effectiveFrom)} to{' '}
                    {value.effectiveTo ? formatDate(value.effectiveTo) : 'open ended'}
                  </p>
                  {value.notes ? <p className="mt-1 text-sm">{value.notes}</p> : null}
                  {value.endReason ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ended: {value.endReason}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!value.endReason ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={editEntitlementMutation.isPending}
                      onClick={() => {
                        editEntitlementMutation.reset()
                        setEntitlementEditTarget(value)
                      }}
                    >
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Button>
                  ) : null}
                  {value.isEffective ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={endMutation.isPending}
                      onClick={() =>
                        setLifecycleTarget({ kind: 'entitlement', entitlement: value })
                      }
                    >
                      End now
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!entitlementsQuery.isLoading && !(entitlementsQuery.data ?? []).length ? (
              <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                No service entitlements recorded.
              </p>
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="retention" className="mt-5"><OrganizationRetentionPolicyPanel enabled={activeTab === 'retention'} organizationId={organizationId} organizationName={organization.name} /></TabsContent>
      </Tabs></CardContent></Card>

      {!embedded ? <OrganizationFormDialog open={editOpen} organization={organization} isPending={editMutation.isPending} error={editMutation.error ? apiErrorMessage(editMutation.error) : undefined} onOpenChange={setEditOpen} onSubmit={(values) => editMutation.mutate(values)} /> : null}
      {!embedded ? <OrganizationConversionDialog organization={organization} targetKind={conversionTarget} isPending={conversionMutation.isPending} error={conversionMutation.error ? apiErrorMessage(conversionMutation.error) : undefined} onOpenChange={(open) => { if (!open) setConversionTarget(null) }} onConfirm={() => { if (conversionTarget) conversionMutation.mutate(conversionTarget) }} /> : null}
      <InviteDialog open={inviteOpen} isPending={inviteMutation.isPending} error={inviteMutation.error ? apiErrorMessage(inviteMutation.error) : undefined} onOpenChange={setInviteOpen} onSubmit={(values) => inviteMutation.mutate(values)} />
      <DevelopmentInviteLinkDialog
        invitationLink={developmentInviteLink}
        onOpenChange={(open) => {
          if (!open) setDevelopmentInviteLink(null)
        }}
      />
      <EntitlementDialog open={entitlementOpen} organization={organization} requests={requestsQuery.data ?? []} isPending={entitlementMutation.isPending} error={entitlementMutation.error ? apiErrorMessage(entitlementMutation.error) : undefined} onOpenChange={setEntitlementOpen} onSubmit={(values) => entitlementMutation.mutate(values)} />
      <EditEntitlementDialog
        entitlement={entitlementEditTarget}
        organization={organization}
        requests={requestsQuery.data ?? []}
        isPending={editEntitlementMutation.isPending}
        error={editEntitlementMutation.error ? apiErrorMessage(editEntitlementMutation.error) : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEntitlementEditTarget(null)
            editEntitlementMutation.reset()
          }
        }}
        onSubmit={(values) => {
          if (entitlementEditTarget) {
            editEntitlementMutation.mutate({
              entitlement: entitlementEditTarget,
              values,
            })
          }
        }}
      />
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
    </Root>
  )

}

type DetailLifecycleTarget =
  | { kind: 'member'; membershipId: string; email: string }
  | { kind: 'entitlement'; entitlement: ServiceEntitlement }
  | null

const inviteSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(100),
  lastName: z.string().trim().min(1, 'Enter a last name.').max(100),
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(['Administrator', 'Member']),
})
type InviteValues = z.infer<typeof inviteSchema>

export function DevelopmentInviteLinkDialog({
  invitationLink,
  onOpenChange,
}: {
  invitationLink: DevelopmentInvitationLink | null
  onOpenChange: (open: boolean) => void
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)

  const copyLink = async () => {
    if (!invitationLink) return

    try {
      await navigator.clipboard.writeText(invitationLink.inviteUrl)
      setCopyStatus('Sign-in link copied.')
    } catch {
      setCopyStatus('Automatic copy was unavailable. Select the link and copy it manually.')
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setCopyStatus(null)
    onOpenChange(open)
  }

  return (
    <Dialog
      open={Boolean(invitationLink)}
      onOpenChange={handleOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Development sign-in link</DialogTitle>
          <DialogDescription>
            This fresh link replaces the prior invitation link. Copy it into a private window,
            then sign in or create the invited development account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="development-invite-link">Sign-in link</Label>
          <Input
            id="development-invite-link"
            readOnly
            value={invitationLink?.inviteUrl ?? ''}
            onFocus={(event) => event.currentTarget.select()}
          />
          {copyStatus ? <p className="text-sm text-muted-foreground" role="status">{copyStatus}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
          <Button type="button" onClick={() => void copyLink()}>
            <Copy data-icon="inline-start" />
            Copy link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteDialog({ error, isPending, onOpenChange, onSubmit, open }: { error?: string; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: InviteValues) => void; open: boolean }) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { firstName: '', lastName: '', email: '', role: 'Member' } })
  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) form.reset() }}><DialogContent><DialogHeader><DialogTitle>Invite account user</DialogTitle><DialogDescription>Enter the designated CRM contact after Phaeno review. Portal access begins only after the recipient accepts this invitation.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="invite-user" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="invite-first-name"><RequiredFieldName>First name</RequiredFieldName></Label><Input id="invite-first-name" autoComplete="given-name" required aria-invalid={Boolean(form.formState.errors.firstName)} {...form.register('firstName')} />{form.formState.errors.firstName ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.firstName.message}</p> : null}</div><div className="grid gap-1.5"><Label htmlFor="invite-last-name"><RequiredFieldName>Last name</RequiredFieldName></Label><Input id="invite-last-name" autoComplete="family-name" required aria-invalid={Boolean(form.formState.errors.lastName)} {...form.register('lastName')} />{form.formState.errors.lastName ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.lastName.message}</p> : null}</div></div><div className="grid gap-1.5"><Label htmlFor="invite-email"><RequiredFieldName>Email</RequiredFieldName></Label><Input id="invite-email" type="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />{form.formState.errors.email ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.email.message}</p> : null}</div><div className="grid gap-1.5"><Label htmlFor="invite-role"><RequiredFieldName>Role</RequiredFieldName></Label><select id="invite-role" className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('role')}><option value="Member">Member</option><option value="Administrator">Organization administrator</option></select></div></form><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="invite-user" disabled={isPending}>{isPending ? 'Sending…' : 'Send invitation'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}

function ReadinessChecklist({
  readiness,
  isLoading,
  isStale,
}: {
  readiness?: Awaited<ReturnType<typeof getOperationalReadiness>>
  isLoading: boolean
  isStale: boolean
}) {
  if (isLoading) {
    return <p role="status" className="rounded-lg border p-4 text-sm text-muted-foreground">Checking PSeq operational readiness…</p>
  }
  if (!readiness) return null
  return (
    <section className="rounded-lg border p-4" aria-labelledby="readiness-checklist-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="readiness-checklist-title" className="font-medium">PSeq operational readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Derived from account, access, service, order, sample, delivery, and billing configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStale ? <Badge variant="outline">Checking for changes</Badge> : null}
          <Badge variant={readiness.state === 'Ready' ? 'secondary' : 'outline'}>{readiness.state}</Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Info label="Internal staging" value={readiness.canStageOrder ? 'Allowed' : 'Blocked'} />
        <Info label="Quote and commitment" value={readiness.canIssueQuote ? 'Allowed' : 'Blocked'} />
      </div>
      {readiness.blockers.length ? (
        <ul className="mt-4 space-y-2">
          {readiness.blockers.map((blocker) => (
            <li key={blocker.code} className="rounded-md bg-muted/50 p-3 text-sm">
              <span className="font-medium">{blocker.label}</span>
              <span className="mt-1 block text-muted-foreground">{blocker.nextAction}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">All readiness checks are complete.</p>
      )}
    </section>
  )
}

function InvitationRow({
  invitation,
  isPending,
  onAction,
  onDevelopmentLink,
}: {
  invitation: Invitation
  isPending: boolean
  onAction: (action: 'resend' | 'revoke') => void
  onDevelopmentLink?: () => void
}) {
  const delivery = invitation.deliveryStatus ?? 'Not queued'
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-medium">{invitation.firstName} {invitation.lastName}</p>
        <p className="text-xs text-muted-foreground">{invitation.email} · {invitation.isOrganizationAdmin ? 'Administrator' : 'Member'}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Access: {invitation.isExpired ? 'Expired' : invitation.status} · Email: {delivery} · Sends: {invitation.sendCount} · Expires {formatDate(invitation.expiresAt)}
        </p>
        {invitation.lastSendError ? <p role="status" className="mt-1 text-sm text-destructive">{invitation.lastSendError}</p> : null}
        {invitation.hasHardBounce ? <p className="mt-1 text-sm text-destructive">Hard bounce: revoke and issue a new invitation to the corrected address.</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onDevelopmentLink ? <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={onDevelopmentLink}><Copy data-icon="inline-start" />Create sign-in link</Button> : null}
        <Button type="button" size="sm" variant="outline" disabled={isPending || invitation.hasHardBounce} onClick={() => onAction('resend')}>Resend</Button>
        <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => onAction('revoke')}>Revoke</Button>
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) { return <Card size="sm"><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-lg font-semibold">{value}</p></CardContent></Card> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border p-4"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) }
function serviceLabel(value: string) { return value === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit + data assembly' }
function NotFound() { return <main className="page-wrap px-4 py-8"><Card className="max-w-2xl"><CardHeader><CardTitle>Portal access not found</CardTitle><CardDescription>The Company&apos;s access settings could not be loaded.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/crm/companies"><ArrowLeft data-icon="inline-start" />Back to Companies</Link></Button></CardContent></Card></main> }
