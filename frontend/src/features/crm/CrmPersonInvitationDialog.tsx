import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import type { CrmCompanyPerson } from '#/api/crm'
import { apiErrorMessage, listInvitations, resendInvitation, revokeInvitation } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { InvitationAccessDialog } from '#/features/invitations/InvitationAccessDialog'

export type PersonInvitationAction = 'edit' | 'resend' | 'revoke'

/** Each Company invitation action has its own bounded review, separate from active access. */
export function CrmPersonInvitationDialog({ organizationId, person, action, onClose, onCompleted, returnFocusTo }: {
  organizationId: string
  person: CrmCompanyPerson
  action: PersonInvitationAction
  onClose: () => void
  onCompleted: (message: string) => Promise<void>
  returnFocusTo?: HTMLElement | null
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  const invitations = useQuery({ queryKey: ['organization-invitations', organizationId], queryFn: () => listInvitations(organizationId) })
  const invitation = invitations.data?.find(value => value.id === (person.invitationId ?? person.suggestedInvitationId))
  const label = action === 'edit' ? 'Edit invited access' : action === 'resend' ? 'Resend invite' : 'Revoke invite'
  const unavailable = !invitation || invitation.status !== 'Pending'
  const change = useMutation({
    mutationFn: () => action === 'resend' ? resendInvitation(invitation!.id) : revokeInvitation(invitation!.id),
    onSuccess: async () => {
      await onCompleted(action === 'resend' ? 'Invitation email queued. The recipient must accept before access starts.' : 'Invitation revoked. Its link can no longer grant access.')
      onClose()
    },
    onError: async () => { await invitations.refetch() },
  })
  if (action === 'edit' && invitation?.status === 'Pending') return <InvitationAccessDialog
    invitation={invitation} returnFocusTo={returnFocusTo} onClose={onClose}
    onSaved={() => onCompleted('Invited access updated. The existing invitation is still used; no new invitation was sent.')} />
  return <Dialog open onOpenChange={open => { if (!open && !change.isPending) onClose() }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}
      onCloseAutoFocus={event => { if (returnFocusTo?.isConnected) { event.preventDefault(); returnFocusTo.focus() } }}>
      <DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>{person.displayName} · {invitation?.email ?? person.email}</DialogDescription></DialogHeader>
      {invitations.isPending || invitations.isFetching ? <p role="status">Checking current invitation…</p> : null}
      {invitations.error || change.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(change.error ?? invitations.error)}</AlertDescription></Alert> : null}
      {invitations.isError ? <Button variant="outline" onClick={() => void invitations.refetch()}>Retry invitation</Button> : null}
      {invitations.isSuccess && !invitations.isFetching ? unavailable ? <p role="status">This invitation is no longer pending. Close this dialog and refresh People.</p> : <>
        <p className="text-sm">{invitation.isExpired ? 'Invitation expired' : 'Invitation pending'} · Delivery: {invitation.deliveryStatus ?? 'Not sent'}</p>
        {action === 'resend' ? <p>Send a renewed invitation to {invitation.email}? The previous link will stop working. Access still begins only after acceptance.</p>
          : action === 'revoke' ? <p>Revoke this invitation? Its link will no longer grant access. Existing access to other Companies is unaffected.</p> : null}
        {invitation.lastSendError ? <p className="text-sm text-destructive">{invitation.lastSendError}</p> : null}
        {action === 'resend' && invitation.hasHardBounce ? <p role="alert" className="text-sm text-destructive">Hard bounce: revoke this invitation, correct the Contact email, and issue a new invitation from People.</p> : null}
      </> : null}
      <DialogFooter><Button ref={cancel} variant="outline" disabled={change.isPending} onClick={onClose}>Cancel</Button>
        {action !== 'edit' ? <Button variant={action === 'revoke' ? 'destructive' : 'default'} disabled={change.isPending || invitations.isFetching || invitations.isError || unavailable || (action === 'resend' && invitation?.hasHardBounce)} onClick={() => change.mutate()}>{change.isPending ? 'Saving…' : label}</Button> : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
