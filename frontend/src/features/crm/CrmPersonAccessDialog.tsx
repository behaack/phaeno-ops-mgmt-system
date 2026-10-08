import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CrmCompanyPerson } from '#/api/crm'
import { apiErrorMessage, deactivateDepartmentMember, deactivateMembership, listDepartments, listOrganizationUsers, updateMembershipRole, upsertDepartmentMember } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { usePhaenoSession } from '#/features/auth/session-context'

type AccessChange = { label: string; description: string; run: () => Promise<unknown>; destructive?: boolean; notifies?: boolean }

/** Company People owns external access; all changes use the existing tenant authorization APIs. */
export function CrmPersonAccessDialog({ organizationId, person, onClose, returnFocusTo }: { organizationId: string; person: CrmCompanyPerson; onClose: () => void; returnFocusTo?: HTMLElement | null }) {
  const client = useQueryClient()
  const { session } = usePhaenoSession()
  const [confirmation, setConfirmation] = useState<AccessChange | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [openingTrigger] = useState(() => returnFocusTo ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null))
  const confirmationCancel = useRef<HTMLButtonElement>(null)
  const changeTrigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (confirmation) confirmationCancel.current?.focus()
    else if (changeTrigger.current?.isConnected) changeTrigger.current.focus()
  }, [confirmation])
  const users = useQuery({ queryKey: ['organization-users', organizationId], queryFn: () => listOrganizationUsers(organizationId) })
  const departments = useQuery({ queryKey: ['organization-departments', organizationId, false], queryFn: () => listDepartments(organizationId, false) })
  const user = users.data?.find(value => value.id === person.portalUserId)
  const membership = user?.memberships.find(value => value.organizationId === organizationId)
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-invitations', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-departments', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-department-members', organizationId] }),
    client.invalidateQueries({ queryKey: ['crm-company-people'] }),
    client.invalidateQueries({ queryKey: ['session'] }),
  ])
  const change = useMutation({
    mutationFn: (action: AccessChange) => action.run(),
    onSuccess: async (_, action) => {
      setConfirmation(null)
      setFeedback(action.notifies ? 'Access updated. An informational email has been queued; the user does not need to accept another invitation.' : 'Invitation updated.')
      await refresh()
    },
    onError: async () => { setConfirmation(null); await refresh() },
  })
  const loading = users.isPending || departments.isPending
  const unavailable = users.isError || departments.isError
  const busy = loading || unavailable || change.isPending
  const error = users.error ?? departments.error ?? change.error
  const choose = (action: AccessChange, triggerId: string) => {
    changeTrigger.current = document.getElementById(triggerId)
    change.reset(); setFeedback(null); setConfirmation(action)
  }
  return <Dialog open onOpenChange={open => { if (!open && !change.isPending) onClose() }}>
    <DialogContent className="max-w-2xl" onCloseAutoFocus={event => { if (openingTrigger?.isConnected) { event.preventDefault(); openingTrigger.focus() } }}>
      <DialogHeader>
        <DialogTitle>Manage access</DialogTitle>
        <DialogDescription>{person.displayName} · {person.email}. Changes affect this Company's access only.</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
      {feedback ? <p role="status" className="text-sm">{feedback}</p> : null}
      {loading ? <p role="status">Loading current access…</p> : null}
      {unavailable ? <Button variant="outline" onClick={() => void refresh()}>Retry current access</Button> : null}
      {confirmation ? <section className="space-y-3 rounded-lg border p-4" aria-label="Confirm access change">
        <p>{confirmation.description}</p><div className="flex flex-wrap gap-2"><Button ref={confirmationCancel} variant="outline" disabled={change.isPending} onClick={() => setConfirmation(null)}>Keep unchanged</Button><Button variant={confirmation.destructive ? 'destructive' : 'default'} disabled={busy} onClick={() => change.mutate(confirmation)}>{change.isPending ? 'Saving…' : confirmation.label}</Button></div>
      </section> : null}
      {!busy && membership ? <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Organization access</h3>
          {membership.isActive ? (
            <ActionMenu><DropdownMenuTrigger asChild><Button id="company-member-actions" variant="outline" disabled={Boolean(confirmation)}>Actions<ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
                <DropdownMenuItem onSelect={() => choose({ label: 'Save role', notifies: true, description: `Make ${person.displayName} ${membership.isOrganizationAdmin ? 'a member with assigned-department access' : 'an Organization administrator with access to every department'}? This applies immediately and sends an informational email.`, run: () => updateMembershipRole(membership.id, !membership.isOrganizationAdmin) }, 'company-member-actions')}>{membership.isOrganizationAdmin ? 'Make member' : 'Make Organization administrator'}</DropdownMenuItem>
                {user?.id !== session?.user?.id ? <DropdownMenuItem variant="destructive" onSelect={() => choose({ label: 'Deactivate membership', destructive: true, notifies: true, description: `${person.displayName} will lose access to this Company and receive an informational email. A new invitation is required to restore access.`, run: () => deactivateMembership(membership.id) }, 'company-member-actions')}>Deactivate membership</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </ActionMenu>
          ) : null}
        </div>
        <p className="text-sm">{membership.isActive ? membership.isOrganizationAdmin ? 'Organization administrator — all departments' : 'Member — assigned departments only' : 'Membership inactive — a new invitation is required to restore access.'}</p>
        {membership.isActive ? (
          <p className="text-sm text-muted-foreground">Access changes apply immediately. The user receives an informational email; no new invitation is needed.</p>
        ) : null}
        {membership.isActive && !membership.isOrganizationAdmin ? <div className="space-y-2"><h3 className="font-medium">Department access</h3>{departments.data?.map(department => {
          const assignment = membership.departments?.find(value => value.departmentId === department.id)
          const active = assignment?.isActive === true
          const triggerId = `company-department-access-${department.id}`
          return <div key={department.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div><p className="font-medium">{department.name}</p><p className="text-sm text-muted-foreground">{active ? assignment.isDepartmentAdmin ? 'Department administrator' : 'Member' : 'No access'}</p></div>
            <ActionMenu><DropdownMenuTrigger asChild><Button id={triggerId} size="sm" variant="outline" disabled={Boolean(confirmation)} aria-label={`Actions for ${department.name} access`}>Actions<ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
                <DropdownMenuItem onSelect={() => choose({ label: active ? 'Save department role' : 'Add department access', notifies: true, description: `${active && !assignment.isDepartmentAdmin ? 'Give department-administrator access' : 'Give member access'} to ${person.displayName} in ${department.name}? This applies immediately and sends an informational email.`, run: () => upsertDepartmentMember(organizationId, department.id, membership.id, { isDepartmentAdmin: active && !assignment.isDepartmentAdmin, version: assignment?.version ?? null }) }, triggerId)}>{active ? assignment.isDepartmentAdmin ? 'Make member' : 'Make department administrator' : 'Add access'}</DropdownMenuItem>
                {active ? <DropdownMenuItem variant="destructive" onSelect={() => choose({ label: 'Remove department access', destructive: true, notifies: true, description: `Remove ${person.displayName}'s access to ${department.name}? At least one active department must remain. This applies immediately and sends an informational email.`, run: () => deactivateDepartmentMember(organizationId, department.id, membership.id, assignment.version) }, triggerId)}>Remove access</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </ActionMenu>
          </div>
        })}</div> : null}
      </section> : null}
      {!busy && !membership && !error ? <p className="text-sm text-muted-foreground">Active membership was not found. Close this dialog and refresh People to review the current access.</p> : null}
      <DialogFooter><Button variant="outline" disabled={change.isPending} onClick={onClose}>Done</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
