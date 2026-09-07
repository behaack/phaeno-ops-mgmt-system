import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { CrmCompanyPerson } from '#/api/crm'
import { apiErrorMessage, deactivateDepartmentMember, deactivateMembership, listDepartments, listInvitations, listOrganizationUsers, resendInvitation, revokeInvitation, updateMembershipRole, upsertDepartmentMember } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { usePhaenoSession } from '#/features/auth/session-context'

type AccessChange = { label: string; description: string; run: () => Promise<unknown>; destructive?: boolean }

/** Company People owns external access; all changes use the existing tenant authorization APIs. */
export function CrmPersonAccessDialog({ organizationId, person, onClose }: { organizationId: string; person: CrmCompanyPerson; onClose: () => void }) {
  const client = useQueryClient()
  const { session } = usePhaenoSession()
  const [confirmation, setConfirmation] = useState<AccessChange | null>(null)
  const [openingTrigger] = useState(() => typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const confirmationCancel = useRef<HTMLButtonElement>(null)
  const changeTrigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (confirmation) confirmationCancel.current?.focus()
    else if (changeTrigger.current?.isConnected) changeTrigger.current.focus()
  }, [confirmation])
  const users = useQuery({ queryKey: ['organization-users', organizationId], queryFn: () => listOrganizationUsers(organizationId) })
  const departments = useQuery({ queryKey: ['organization-departments', organizationId, false], queryFn: () => listDepartments(organizationId, false) })
  const invitations = useQuery({ queryKey: ['organization-invitations', organizationId], queryFn: () => listInvitations(organizationId) })
  const user = users.data?.find(value => value.id === person.portalUserId)
  const membership = user?.memberships.find(value => value.organizationId === organizationId)
  const invitation = invitations.data?.find(value => value.id === person.invitationId || value.id === person.suggestedInvitationId)
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-invitations', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-departments', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-department-members', organizationId] }),
    client.invalidateQueries({ queryKey: ['crm-company-people'] }),
    client.invalidateQueries({ queryKey: ['session'] }),
  ])
  const change = useMutation({ mutationFn: (action: AccessChange) => action.run(), onSuccess: async () => { setConfirmation(null); await refresh() }, onError: async () => { setConfirmation(null); await refresh() } })
  const loading = users.isPending || departments.isPending || invitations.isPending
  const unavailable = users.isError || departments.isError || invitations.isError
  const busy = loading || unavailable || change.isPending
  const error = users.error ?? departments.error ?? invitations.error ?? change.error
  const choose = (action: AccessChange) => { changeTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; change.reset(); setConfirmation(action) }
  return <Dialog open onOpenChange={(open) => { if (!open && !change.isPending) onClose() }}>
    <DialogContent className="max-w-2xl" onCloseAutoFocus={event => { if (openingTrigger?.isConnected) { event.preventDefault(); openingTrigger.focus() } }}>
      <DialogHeader><DialogTitle>Manage Portal access</DialogTitle><DialogDescription>{person.displayName} · {person.email}. Changes affect this Company's access only.</DialogDescription></DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
      {loading ? <p role="status">Loading current access…</p> : null}
      {unavailable ? <Button variant="outline" onClick={() => void refresh()}>Retry current access</Button> : null}
      {confirmation ? <section className="space-y-3 rounded-lg border p-4" aria-label="Confirm access change">
        <p>{confirmation.description}</p><div className="flex flex-wrap gap-2"><Button ref={confirmationCancel} variant="outline" disabled={change.isPending} onClick={() => setConfirmation(null)}>Keep unchanged</Button><Button variant={confirmation.destructive ? 'destructive' : 'default'} disabled={busy} onClick={() => change.mutate(confirmation)}>{change.isPending ? 'Saving…' : confirmation.label}</Button></div>
      </section> : null}
      {!busy && membership ? <section className="space-y-3">
        <h3 className="font-medium">Organization access</h3>
        <p className="text-sm">{membership.isActive ? membership.isOrganizationAdmin ? 'Organization administrator — all departments' : 'Member — assigned departments only' : 'Membership inactive — a new invitation is required to restore access.'}</p>
        {membership.isActive ? <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: 'Save role', description: `Make ${person.displayName} ${membership.isOrganizationAdmin ? 'a member with assigned-department access' : 'an Organization administrator with access to every department'}?`, run: () => updateMembershipRole(membership.id, !membership.isOrganizationAdmin) })}>{membership.isOrganizationAdmin ? 'Make member' : 'Make Organization administrator'}</Button>
          {user?.id !== session?.user?.id ? <Button variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: 'Deactivate membership', destructive: true, description: `${person.displayName} will lose access to this Company. A new invitation is required to restore access.`, run: () => deactivateMembership(membership.id) })}>Deactivate membership</Button> : null}
        </div> : null}
        {membership.isActive && !membership.isOrganizationAdmin ? <div className="space-y-2"><h3 className="font-medium">Department access</h3>{departments.data?.map(department => {
          const assignment = membership.departments?.find(value => value.departmentId === department.id)
          const active = assignment?.isActive === true
          return <div key={department.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div><p className="font-medium">{department.name}</p><p className="text-sm text-muted-foreground">{active ? assignment.isDepartmentAdmin ? 'Department administrator' : 'Member' : 'No access'}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: active ? 'Save department role' : 'Add department access', description: `${active && !assignment.isDepartmentAdmin ? 'Give department-administrator access' : 'Give member access'} to ${person.displayName} in ${department.name}?`, run: () => upsertDepartmentMember(organizationId, department.id, membership.id, { isDepartmentAdmin: active && !assignment.isDepartmentAdmin, version: assignment?.version ?? null }) })}>{active ? assignment.isDepartmentAdmin ? 'Make member' : 'Make department administrator' : 'Add access'}</Button>
              {active ? <Button size="sm" variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: 'Remove department access', destructive: true, description: `Remove ${person.displayName}'s access to ${department.name}? At least one active department must remain.`, run: () => deactivateDepartmentMember(organizationId, department.id, membership.id, assignment.version) })}>Remove access</Button> : null}
            </div>
          </div>
        })}</div> : null}
      </section> : null}
      {!busy && invitation ? <section className="space-y-3"><h3 className="font-medium">Invitation</h3><p className="text-sm">{invitation.status}{invitation.isExpired ? ' · Expired' : ''} · Delivery: {invitation.deliveryStatus ?? 'Not sent'}</p>{invitation.lastSendError ? <p className="text-sm text-destructive">{invitation.lastSendError}</p> : null}{invitation.status === 'Pending' ? <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: 'Resend invitation', description: `Send a renewed invitation to ${invitation.email}?`, run: () => resendInvitation(invitation.id) })}>Resend invitation</Button>
        <Button variant="outline" disabled={Boolean(confirmation)} onClick={() => choose({ label: 'Revoke invitation', destructive: true, description: `Revoke the pending invitation for ${invitation.email}? Its current link will no longer grant access.`, run: () => revokeInvitation(invitation.id) })}>Revoke invitation</Button>
      </div> : null}</section> : null}
      {!busy && !membership && !invitation && !error ? <p className="text-sm text-muted-foreground">No active membership or pending invitation. Invite this Contact from People.</p> : null}
      <DialogFooter><Button variant="outline" disabled={change.isPending} onClick={onClose}>Done</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
