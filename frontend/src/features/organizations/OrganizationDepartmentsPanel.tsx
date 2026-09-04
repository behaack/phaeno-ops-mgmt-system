import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Pencil, Plus, Star, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { DepartmentSettingsDialog } from './DepartmentSettingsDialog'

import {
  apiErrorMessage,
  createDepartment,
  deactivateDepartmentMember,
  listDepartmentMembers,
  listDepartments,
  listOrganizationUsers,
  setDefaultDepartment,
  setDepartmentActive,
  updateDepartment,
  upsertDepartmentMember,
  type Department,
  type DepartmentInput,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function OrganizationDepartmentsPanel({ organizationId }: { organizationId: string }) {
  const client = useQueryClient()
  const [editTarget, setEditTarget] = useState<Department | 'new' | null>(null)
  const [lifecycleTarget, setLifecycleTarget] = useState<{ department: Department; action: 'default' | 'toggle' } | null>(null)
  const [saveConflict, setSaveConflict] = useState<string | null>(null)
  const [memberTarget, setMemberTarget] = useState<Department | null>(null)
  const departments = useQuery({
    queryKey: ['organization-departments', organizationId, true],
    queryFn: () => listDepartments(organizationId),
  })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization-departments', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['crm-company-people'] }),
    client.invalidateQueries({ queryKey: ['session'] }),
  ])
  const save = useMutation({
    mutationFn: ({ target, input }: { target: Department | 'new'; input: DepartmentInput }) =>
      target === 'new'
        ? createDepartment(organizationId, input)
        : updateDepartment(organizationId, target.id, { ...input, version: target.version }),
    onError: async (error, { target }) => {
      if (target !== 'new' && isAxiosError(error) && error.response?.status === 409) {
        try {
          const latest = await listDepartments(organizationId)
          const refreshed = latest.find((department) => department.id === target.id)
          if (refreshed) {
            setEditTarget(refreshed)
            setSaveConflict('The department changed. Its latest version is loaded and your entries are preserved. Review them before saving again.')
          }
        } catch {
          setSaveConflict('The department changed, but its latest version could not be loaded. Your entries are preserved. Check your connection, then try again.')
        }
        await refresh()
      }
    },
    onSuccess: async () => {
      setEditTarget(null)
      await refresh()
    },
  })
  const lifecycle = useMutation({
    mutationFn: ({ department, action }: { department: Department; action: 'default' | 'toggle' }) =>
      action === 'default'
        ? setDefaultDepartment(organizationId, department)
        : setDepartmentActive(organizationId, department, !department.isActive),
    onSuccess: async () => { setLifecycleTarget(null); await refresh() },
    onError: async () => { setLifecycleTarget(null); await refresh() },
  })

  return (
    <>
      <Card>
        <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Operational and access boundaries within this organization. Settings inherit from the organization unless overridden here.
              </CardDescription>
            <CardAction><Button id="add-department" size="sm" onClick={() => { save.reset(); setSaveConflict(null); setEditTarget('new') }}>
              <Plus data-icon="inline-start" />
              Add department
            </Button></CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {lifecycle.error && !lifecycleTarget ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(lifecycle.error)} Reopen the action to review the latest department.</AlertDescription></Alert> : null}
          {departments.error ? (
            <Alert variant="destructive"><AlertDescription>{apiErrorMessage(departments.error)}</AlertDescription></Alert>
          ) : null}
          {departments.isLoading ? <p className="text-sm text-muted-foreground" role="status">Loading departments…</p> : null}
          {(departments.data ?? []).map((department) => (
            <article key={department.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{department.name}</h3>
                    <Badge variant="outline">{department.code}</Badge>
                    {department.isDefault ? <Badge>Default</Badge> : null}
                    {!department.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {department.description ?? 'No department description recorded.'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {department.activeMemberCount} active {department.activeMemberCount === 1 ? 'member' : 'members'} · {overrideSummary(department)}
                  </p>
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button id={`department-actions-${department.id}`} size="icon-sm" variant="outline" disabled={lifecycle.isPending} aria-label={`Actions for ${department.name}`}><Ellipsis aria-hidden="true" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => { save.reset(); setSaveConflict(null); setEditTarget(department) }}><Pencil aria-hidden="true" />Edit settings</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setMemberTarget(department)}><UsersRound aria-hidden="true" />Manage members</DropdownMenuItem>
                    {!department.isDefault && department.isActive ? (
                      <DropdownMenuItem onSelect={() => { lifecycle.reset(); setLifecycleTarget({ department, action: 'default' }) }}><Star aria-hidden="true" />Make default</DropdownMenuItem>
                    ) : null}
                    {!department.isDefault ? (
                      <DropdownMenuItem onSelect={() => { lifecycle.reset(); setLifecycleTarget({ department, action: 'toggle' }) }}>{department.isActive ? 'Deactivate' : 'Reactivate'}</DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
      {editTarget ? <DepartmentSettingsDialog
        key={editTarget === 'new' ? 'new' : editTarget.id}
        target={editTarget}
        pending={save.isPending}
        error={saveConflict ? new Error(saveConflict) : save.error}
        onClose={() => setEditTarget(null)}
        onSubmit={(input) => { setSaveConflict(null); save.mutate({ target: editTarget, input }) }}
      /> : null}
      <Dialog open={Boolean(lifecycleTarget)} onOpenChange={(open) => { if (!open && !lifecycle.isPending) setLifecycleTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lifecycleTarget?.action === 'default' ? 'Change default department' : lifecycleTarget?.department.isActive ? 'Deactivate department' : 'Reactivate department'}</DialogTitle>
            <DialogDescription>
              {lifecycleTarget?.department.name}: {lifecycleTarget?.action === 'default'
                ? 'New default selections will use this department. Existing records and memberships keep their department.'
                : lifecycleTarget?.department.isActive
                  ? 'Users will lose access to this department. Assign active members to another department first. Existing records are retained.'
                  : 'The department becomes available again. User assignments must be reviewed and restored explicitly.'}
            </DialogDescription>
          </DialogHeader>
          {lifecycle.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(lifecycle.error)}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button variant="outline" disabled={lifecycle.isPending} onClick={() => setLifecycleTarget(null)}>Cancel</Button>
            <Button disabled={lifecycle.isPending} variant={lifecycleTarget?.action === 'toggle' && lifecycleTarget.department.isActive ? 'destructive' : 'default'}
              onClick={() => { if (lifecycleTarget) lifecycle.mutate(lifecycleTarget) }}>
              {lifecycle.isPending ? 'Saving…' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {memberTarget ? <DepartmentMembersDialog
        key={memberTarget.id}
        organizationId={organizationId}
        department={memberTarget}
        onOpenChange={(open) => { if (!open) setMemberTarget(null) }}
      /> : null}
    </>
  )
}

function DepartmentMembersDialog({
  organizationId,
  department,
  onOpenChange,
}: {
  organizationId: string
  department: Department | null
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  const users = useQuery({
    queryKey: ['organization-users', organizationId],
    queryFn: () => listOrganizationUsers(organizationId),
    enabled: Boolean(department),
  })
  const members = useQuery({
    queryKey: ['organization-department-members', organizationId, department?.id],
    queryFn: () => listDepartmentMembers(organizationId, department!.id),
    enabled: Boolean(department),
  })
  const change = useMutation({
    mutationFn: ({ membershipId, active, admin, version }: { membershipId: string; active: boolean; admin: boolean; version: number | null }) =>
      active
        ? upsertDepartmentMember(organizationId, department!.id, membershipId, { isDepartmentAdmin: admin, version })
        : deactivateDepartmentMember(organizationId, department!.id, membershipId, version!),
    onError: async () => {
      setChangeTarget(null)
      await client.invalidateQueries({ queryKey: ['organization-department-members', organizationId, department?.id] })
    },
    onSuccess: async () => {
      setChangeTarget(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['session'] }),
        client.invalidateQueries({ queryKey: ['organization-department-members', organizationId, department?.id] }),
        client.invalidateQueries({ queryKey: ['organization-departments', organizationId] }),
        client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
        client.invalidateQueries({ queryKey: ['crm-company-people'] }),
      ])
    },
  })
  const [changeTarget, setChangeTarget] = useState<{
    membershipId: string; active: boolean; admin: boolean; version: number | null; name: string
  } | null>(null)
  const loading = users.isPending || members.isPending
  const activeUsers = (users.data ?? []).filter((user) => user.isActive)
  return (
    <Dialog open={Boolean(department)} onOpenChange={(open) => { if (!change.isPending) onOpenChange(open) }}>
      <DialogContent className="max-w-2xl" onCloseAutoFocus={(event) => {
        event.preventDefault()
        document.getElementById(`department-actions-${department?.id}`)?.focus()
      }}>
        <DialogHeader><DialogTitle>{department?.name} members</DialogTitle><DialogDescription>Department membership limits the work and data a non-organization administrator can access.</DialogDescription></DialogHeader>
        {users.error || members.error || change.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(users.error ?? members.error ?? change.error)}</AlertDescription></Alert> : null}
        {loading ? <p role="status">Loading department members…</p> : null}
        {changeTarget ? <div className="space-y-3">
          <p>{changeTarget.active ? changeTarget.admin ? 'Grant department administrator access to' : 'Set department member access for' : 'Remove department access from'} {changeTarget.name}?</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={change.isPending} onClick={() => setChangeTarget(null)}>Cancel change</Button>
            <Button disabled={change.isPending} onClick={() => change.mutate(changeTarget)}>{change.isPending ? 'Saving…' : 'Confirm access change'}</Button></div>
        </div> : null}
        <div className="space-y-2" aria-busy={loading}>
          {activeUsers.map((user) => {
            const organizationMembership = user.memberships.find((membership) => membership.organizationId === organizationId)
            if (!organizationMembership?.isActive) return null
            const assignment = members.data?.find((member) => member.organizationMembershipId === organizationMembership.id)
            const active = assignment?.isActive === true
            return (
              <div key={user.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium">{user.firstName} {user.lastName}</p><p className="text-xs text-muted-foreground">{user.email}{organizationMembership.isOrganizationAdmin ? ' · Organization admin' : ''}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={active ? 'secondary' : 'outline'} disabled={loading || Boolean(users.error || members.error) || change.isPending || !department?.isActive || organizationMembership.isOrganizationAdmin} onClick={() => { change.reset(); setChangeTarget({ name: `${user.firstName} ${user.lastName}`, membershipId: organizationMembership.id, active: !active, admin: false, version: assignment?.version ?? null }) }}>{organizationMembership.isOrganizationAdmin ? 'All departments' : active ? 'Remove access' : 'Add access'}</Button>
                  {active && !organizationMembership.isOrganizationAdmin ? <Button size="sm" variant="outline" disabled={loading || Boolean(users.error || members.error) || change.isPending || !department?.isActive || organizationMembership.isOrganizationAdmin} onClick={() => { change.reset(); setChangeTarget({ name: `${user.firstName} ${user.lastName}`, membershipId: organizationMembership.id, active: true, admin: !assignment!.isDepartmentAdmin, version: assignment!.version }) }}>{assignment?.isDepartmentAdmin ? 'Make member' : 'Make department admin'}</Button> : null}
                </div>
              </div>
            )
          })}
        </div>
        {!loading && !users.error && !activeUsers.length ? <p className="text-sm text-muted-foreground">No active users are available in this organization.</p> : null}
        <DialogFooter><Button variant="outline" disabled={change.isPending} onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function overrideSummary(department: Department) {
  const count = [department.purchaseOrderRequired, department.billingContactEmail, department.notificationEmail, department.shippingInstructions, department.resultDeliveryInstructions].filter((value) => value !== null).length
  return count ? `${count} configuration ${count === 1 ? 'override' : 'overrides'}` : 'Inherits organization configuration'
}
