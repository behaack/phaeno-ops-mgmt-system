import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Link2, Plus, Send, Unlink } from 'lucide-react'
import { useState } from 'react'

import {
  apiErrorMessage,
  associateCompanyContact,
  linkCrmContactUser,
  listCompanyContacts,
  listCrmCompanyPeople,
  unlinkCrmContactUser,
  type CrmCompanyPerson,
} from '#/api/crm'
import {
  createInvitation,
  listDepartments,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { CrmAssociationRecordCombobox } from './CrmAssociationRecordCombobox'
import { CrmRelationshipRoleSelect } from './CrmRelationshipRoleSelect'

type IdentityAction =
  | { kind: 'link'; person: CrmCompanyPerson }
  | { kind: 'unlink'; person: CrmCompanyPerson }
  | null

export function CrmCompanyPeople({
  companyId,
  accessOrganizationId,
}: {
  companyId: string
  accessOrganizationId: string | null
}) {
  const client = useQueryClient()
  const [associateOpen, setAssociateOpen] = useState(false)
  const [inviteTarget, setInviteTarget] = useState<CrmCompanyPerson | null>(null)
  const [identityAction, setIdentityAction] = useState<IdentityAction>(null)
  const people = useQuery({
    queryKey: ['crm-company-people', companyId],
    queryFn: () => listCrmCompanyPeople(companyId),
  })
  const contacts = useQuery({
    queryKey: ['crm-company-contacts', companyId],
    queryFn: () => listCompanyContacts(companyId),
  })
  const departments = useQuery({
    queryKey: ['organization-departments', accessOrganizationId, false],
    queryFn: () => listDepartments(accessOrganizationId!, false),
    enabled: Boolean(accessOrganizationId),
  })

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['crm-company-people', companyId] }),
      client.invalidateQueries({ queryKey: ['crm-company-contacts', companyId] }),
      client.invalidateQueries({ queryKey: ['organization-users', accessOrganizationId] }),
      client.invalidateQueries({ queryKey: ['organization-invitations', accessOrganizationId] }),
    ])
  }
  const associate = useMutation({
    mutationFn: (input: {
      contactId: string
      jobTitle: string | null
      relationshipRole: string | null
      isPrimaryCompany: boolean
      effectiveFrom: string
    }) => associateCompanyContact(companyId, input),
    onSuccess: async () => {
      setAssociateOpen(false)
      await refresh()
    },
  })
  const invite = useMutation({
    mutationFn: ({
      person,
      departmentIds,
    }: {
      person: CrmCompanyPerson
      departmentIds: string[]
    }) => {
      if (!accessOrganizationId || !person.contactId || !person.email) {
        throw new Error('This Contact is not ready for a Portal invitation.')
      }
      return createInvitation({
        organizationId: accessOrganizationId,
        crmContactId: person.contactId,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        isOrganizationAdmin: false,
        departments: departmentIds.map((departmentId) => ({
          departmentId,
          isDepartmentAdmin: false,
        })),
        labRoles: [],
        businessRoles: [],
      })
    },
    onSuccess: async () => {
      setInviteTarget(null)
      await refresh()
    },
  })
  const identity = useMutation({
    mutationFn: async ({ action, reason }: { action: NonNullable<IdentityAction>; reason: string }) => {
      const { person } = action
      if (action.kind === 'link') {
        if (!person.contactId || !person.suggestedPortalUserId || person.contactVersion === null) {
          throw new Error('The suggested Contact and Portal user are no longer available.')
        }
        await linkCrmContactUser(companyId, person.contactId, {
          userId: person.suggestedPortalUserId,
          contactVersion: person.contactVersion,
          reason,
        })
        return
      }
      if (!person.contactUserLinkId || person.contactUserLinkVersion === null) {
        throw new Error('The identity link is no longer available.')
      }
      await unlinkCrmContactUser(companyId, person.contactUserLinkId, {
        reason,
        version: person.contactUserLinkVersion,
      })
    },
    onSuccess: async () => {
      setIdentityAction(null)
      await refresh()
    },
  })
  const error = people.error ?? contacts.error ?? departments.error

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
          <CardDescription>
            Company contacts, Portal identities, invitations, and department access in one reviewed list.
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setAssociateOpen(true)}>
              <Plus data-icon="inline-start" />
              Associate contact
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>People could not be loaded</AlertTitle>
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          {people.isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">Loading people…</p>
          ) : null}
          {(people.data ?? []).map((person) => (
            <PersonRow
              key={`${person.recordKind}-${person.contactAssociationId ?? person.contactId ?? person.portalUserId ?? person.invitationId}`}
              person={person}
              canInvite={Boolean(accessOrganizationId && person.contactId && person.isContactActive && person.email && person.portalAccessState === 'NotInvited' && !person.suggestedPortalUserId && !person.suggestedInvitationId)}
              onInvite={() => { invite.reset(); setInviteTarget(person) }}
              onIdentityAction={(action) => { identity.reset(); setIdentityAction(action) }}
            />
          ))}
          {!people.isLoading && !people.error && !(people.data?.length ?? 0) ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              No people are associated with this Company.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AssociatePersonDialog
        open={associateOpen}
        excludedContactIds={(contacts.data ?? [])
          .filter((contact) => contact.isActive)
          .map((contact) => contact.contactId)}
        pending={associate.isPending}
        error={associate.error}
        onOpenChange={setAssociateOpen}
        onSubmit={(input) => associate.mutate(input)}
      />
      <PortalInviteDialog
        key={inviteTarget?.contactId ?? 'closed-invite'}
        person={inviteTarget}
        departments={departments.data ?? []}
        pending={invite.isPending}
        error={invite.error}
        onOpenChange={(open) => { if (!open) setInviteTarget(null) }}
        onSubmit={(departmentIds) => {
          if (inviteTarget) invite.mutate({ person: inviteTarget, departmentIds })
        }}
      />
      <IdentityReviewDialog
        key={`${identityAction?.kind ?? ''}-${identityAction?.person.contactId ?? ''}`}
        action={identityAction}
        pending={identity.isPending}
        error={identity.error}
        onOpenChange={(open) => { if (!open) setIdentityAction(null) }}
        onSubmit={(reason) => {
          if (identityAction) identity.mutate({ action: identityAction, reason })
        }}
      />
    </>
  )
}

function PersonRow({
  person,
  canInvite,
  onInvite,
  onIdentityAction,
}: {
  person: CrmCompanyPerson
  canInvite: boolean
  onInvite: () => void
  onIdentityAction: (action: NonNullable<IdentityAction>) => void
}) {
  const identityLabel = person.contactUserLinkId
    ? 'Contact and Portal user linked'
    : person.recordKind === 'Contact'
      ? 'CRM Contact'
      : person.recordKind === 'Invitation'
        ? 'Portal invitation without a linked Contact'
        : 'Portal user without a linked Contact'
  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {person.contactId ? (
              <Link
                to="/crm/contacts/$contactId"
                params={{ contactId: person.contactId }}
                className="font-medium hover:underline"
              >
                {person.displayName}
              </Link>
            ) : (
              <span className="font-medium">{person.displayName}</span>
            )}
            {person.isPrimaryCompany ? <Badge>Primary</Badge> : null}
            <Badge variant={person.portalAccessState === 'Active' ? 'secondary' : 'outline'}>
              {portalAccessLabel(person.portalAccessState)}
            </Badge>
            {person.requiresIdentityReview ? (
              <Badge variant="outline">Identity review</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {person.email ?? 'Email not recorded'}
            {person.jobTitle ? ` · ${person.jobTitle}` : ''}
            {person.relationshipRole ? ` · ${person.relationshipRole}` : ''}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{identityLabel}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {person.isOrganizationAdmin ? <Badge variant="outline">Organization admin</Badge> : null}
            {person.departments.map((department) => (
              <Badge key={department.departmentId} variant="outline">
                {department.departmentName}{department.isDepartmentAdmin ? ' · Admin' : ''}{!department.isActive ? ' · Inactive' : ''}
              </Badge>
            ))}
            {!person.isOrganizationAdmin && !person.departments.some((department) => department.isActive) && person.portalAccessState !== 'NotInvited' ? (
              <Badge variant="outline">No active department</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canInvite ? (
            <Button size="sm" onClick={onInvite}>
              <Send data-icon="inline-start" />
              Invite to Portal
            </Button>
          ) : null}
          {person.suggestedPortalUserId ? (
            <Button size="sm" variant="outline" onClick={() => onIdentityAction({ kind: 'link', person })}>
              <Link2 data-icon="inline-start" />
              Review and link
            </Button>
          ) : null}
          {person.contactUserLinkId ? (
            <Button size="sm" variant="outline" onClick={() => onIdentityAction({ kind: 'unlink', person })}>
              <Unlink data-icon="inline-start" />
              Unlink identity
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function PortalInviteDialog({
  person,
  departments,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  person: CrmCompanyPerson | null
  departments: Array<{ id: string; name: string; isDefault: boolean }>
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (departmentIds: string[]) => void
}) {
  const [validationError, setValidationError] = useState<string | null>(null)
  return (
    <Dialog open={Boolean(person)} onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent>
        <form onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const departmentIds = data.getAll('departmentId').map(String)
          if (!departmentIds.length) {
            setValidationError('Select at least one department before sending the invitation.')
            event.currentTarget.querySelector<HTMLElement>('[role="checkbox"]')?.focus()
            return
          }
          setValidationError(null)
          onSubmit(departmentIds)
        }}>
          <DialogHeader>
            <DialogTitle>Invite Contact to Portal</DialogTitle>
            <DialogDescription>
              Invite {person?.displayName} to the selected departments. Access and the Contact/User link begin only after the recipient accepts this reviewed invitation.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
          {validationError ? <Alert variant="destructive"><AlertDescription>{validationError}</AlertDescription></Alert> : null}
          <fieldset disabled={pending} className="grid gap-2">
            <legend className="text-sm font-medium"><RequiredFieldName>Department access</RequiredFieldName></legend>
            {departments.map((department) => (
              <Label key={department.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal">
                <Checkbox name="departmentId" value={department.id} defaultChecked={department.isDefault} onCheckedChange={() => setValidationError(null)} />
                {department.name}{department.isDefault ? ' (default)' : ''}
              </Label>
            ))}
          </fieldset>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !departments.length}>{pending ? 'Sending invitation…' : 'Send invitation'}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IdentityReviewDialog({
  action,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  action: IdentityAction
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => void
}) {
  const linking = action?.kind === 'link'
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => {
          event.preventDefault()
          onSubmit(String(new FormData(event.currentTarget).get('reason') ?? '').trim())
        }}>
          <DialogHeader>
            <DialogTitle>{linking ? 'Link Contact and Portal user' : 'Unlink Portal identity'}</DialogTitle>
            <DialogDescription>
              {linking
                ? 'Confirm that these records identify the same person. An email match is only a suggestion and never links records automatically.'
                : 'Remove the identity relationship without deleting either the CRM Contact or Portal user.'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">{action?.person.displayName} · {action?.person.email}</p>
          {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
          <div className="grid gap-1.5">
            <Label htmlFor="identity-review-reason"><RequiredFieldName>Reason</RequiredFieldName></Label>
            <Textarea id="identity-review-reason" name="reason" maxLength={500} required />
          </div>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{linking ? 'Link identity' : 'Unlink identity'}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssociatePersonDialog({
  open,
  excludedContactIds,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  excludedContactIds: string[]
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (value: {
    contactId: string
    jobTitle: string | null
    relationshipRole: string | null
    isPrimaryCompany: boolean
    effectiveFrom: string
  }) => void
}) {
  const [primary, setPrimary] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          onSubmit({
            contactId: String(data.get('contactId')),
            jobTitle: nullable(data, 'jobTitle'),
            relationshipRole: nullable(data, 'role'),
            isPrimaryCompany: primary,
            effectiveFrom: String(data.get('effectiveFrom')),
          })
        }}>
          <DialogHeader>
            <DialogTitle>Associate contact</DialogTitle>
            <DialogDescription>Add an existing CRM Contact to this Company without granting Portal access.</DialogDescription>
          </DialogHeader>
          {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="people-association-contact"><RequiredFieldName>Contact</RequiredFieldName></Label>
              <CrmAssociationRecordCombobox id="people-association-contact" name="contactId" kind="contact" excludedIds={excludedContactIds} required />
            </div>
            <div className="grid gap-1.5"><Label htmlFor="people-association-title">Job title</Label><Input id="people-association-title" name="jobTitle" maxLength={150} /></div>
            <div className="grid gap-1.5"><Label htmlFor="people-association-role">Relationship role</Label><CrmRelationshipRoleSelect id="people-association-role" /></div>
            <div className="grid gap-1.5"><Label htmlFor="people-association-date"><RequiredFieldName>Effective from</RequiredFieldName></Label><Input id="people-association-date" name="effectiveFrom" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <Label className="flex cursor-pointer items-center gap-2 font-normal"><Checkbox checked={primary} onCheckedChange={(value) => setPrimary(value === true)} />Primary Company for this Contact</Label>
          </div>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>Associate contact</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function portalAccessLabel(value: string) {
  const labels: Record<string, string> = {
    Active: 'Portal active',
    NotInvited: 'No Portal access',
    InvitationPending: 'Invitation pending',
    InvitationExpired: 'Invitation expired',
    UserDisabled: 'User disabled',
    MembershipInactive: 'Membership inactive',
  }
  return labels[value] ?? value
}

function nullable(data: FormData, name: string) {
  const value = String(data.get(name) ?? '').trim()
  return value || null
}
