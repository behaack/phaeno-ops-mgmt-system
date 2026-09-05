import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Pencil, Plus, Star, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { OrganizationDefaultsPanel } from './OrganizationDefaultsPanel'
import { DepartmentSettingsDialog } from './DepartmentSettingsDialog'
import { DepartmentMembersDialog } from './DepartmentMembersDialog'
import { departmentErrorMessage as apiErrorMessage, departmentMessages as m } from './department-localization'

import {
  createDepartment,
  listDepartments,
  setDefaultDepartment,
  setDepartmentActive,
  updateDepartment,
  type Department,
  type DepartmentInput,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function OrganizationDepartmentsPanel({ organizationId, organizationAdmin = true, managedDepartmentIds = [] }: {
  organizationId: string
  organizationAdmin?: boolean
  managedDepartmentIds?: string[]
}) {
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
            setSaveConflict(m.conflict)
          }
        } catch {
          setSaveConflict(m.conflictLoadFailed)
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
    <div className="space-y-5">
      {organizationAdmin ? <OrganizationDefaultsPanel organizationId={organizationId} /> : null}
      <Card>
        <CardHeader>
              <CardTitle>{m.departments}</CardTitle>
              <CardDescription>
                {m.departmentDescription}
              </CardDescription>
            {organizationAdmin ? <CardAction><Button id="add-department" size="sm" onClick={() => { save.reset(); setSaveConflict(null); setEditTarget('new') }}>
              <Plus data-icon="inline-start" />
              {m.addDepartment}
            </Button></CardAction> : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {!departments.isPending && !departments.error && !(departments.data ?? []).some((department) => organizationAdmin || managedDepartmentIds.includes(department.id)) ? <p role="status" className="text-sm text-muted-foreground">{m.noDepartments}</p> : null}
          {lifecycle.error && !lifecycleTarget ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(lifecycle.error)} {m.reopenAction}</AlertDescription></Alert> : null}
          {departments.error ? (
            <Alert variant="destructive"><AlertDescription>{apiErrorMessage(departments.error)}</AlertDescription></Alert>
          ) : null}
          {departments.isLoading ? <p className="text-sm text-muted-foreground" role="status">Loading departments…</p> : null}
          {(departments.data ?? []).filter((department) => organizationAdmin || managedDepartmentIds.includes(department.id)).map((department) => (
            <article key={department.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{department.name}</h3>
                    <Badge variant="outline">{department.code}</Badge>
                    {department.isDefault ? <Badge>{m.defaultLabel}</Badge> : null}
                    {!department.isActive ? <Badge variant="outline">{m.inactive}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {department.description ?? m.noDescription}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {m.activeMembers(department.activeMemberCount)} · {overrideSummary(department)}
                  </p>
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button id={`department-actions-${department.id}`} size="icon-sm" variant="outline" disabled={lifecycle.isPending} aria-label={m.actionsFor(department.name)}><Ellipsis aria-hidden="true" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => { save.reset(); setSaveConflict(null); setEditTarget(department) }}><Pencil aria-hidden="true" />{m.editSettings}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setMemberTarget(department)}><UsersRound aria-hidden="true" />{m.manageMembers}</DropdownMenuItem>
                    {organizationAdmin && !department.isDefault && department.isActive ? (
                      <DropdownMenuItem onSelect={() => { lifecycle.reset(); setLifecycleTarget({ department, action: 'default' }) }}><Star aria-hidden="true" />{m.makeDefault}</DropdownMenuItem>
                    ) : null}
                    {organizationAdmin && !department.isDefault ? (
                      <DropdownMenuItem onSelect={() => { lifecycle.reset(); setLifecycleTarget({ department, action: 'toggle' }) }}>{department.isActive ? m.deactivate : m.reactivate}</DropdownMenuItem>
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
            <DialogTitle>{lifecycleTarget?.action === 'default' ? m.changeDefault : lifecycleTarget?.department.isActive ? m.deactivateDepartment : m.reactivateDepartment}</DialogTitle>
            <DialogDescription>
              {lifecycleTarget?.department.name}: {lifecycleTarget?.action === 'default'
                ? m.defaultConsequence
                : lifecycleTarget?.department.isActive
                  ? m.deactivateConsequence
                  : m.reactivateConsequence}
            </DialogDescription>
          </DialogHeader>
          {lifecycle.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(lifecycle.error)}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button variant="outline" disabled={lifecycle.isPending} onClick={() => setLifecycleTarget(null)}>{m.cancel}</Button>
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
    </div>
  )
}

function overrideSummary(department: Department) {
  const count = [department.purchaseOrderRequired, department.billingContactEmail, department.notificationEmail, department.shippingInstructions, department.resultDeliveryInstructions].filter((value) => value !== null).length
  return count ? m.overrides(count) : m.inherits
}
