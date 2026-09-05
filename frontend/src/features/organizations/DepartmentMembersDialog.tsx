import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { z } from 'zod'
import {
  deactivateDepartmentMember, listDepartmentMembers, lookupDepartmentMember, upsertDepartmentMember,
  type Department,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { departmentErrorMessage, departmentMessages as m } from './department-localization'

const lookupSchema = z.object({ email: z.string().trim().max(255, m.tooLong(255)).email(m.validEmail) })
type Change = { membershipId: string; active: boolean; admin: boolean; version: number | null; name: string }

export function DepartmentMembersDialog({ organizationId, department, onOpenChange }: {
  organizationId: string
  department: Department
  onOpenChange: (open: boolean) => void
}) {
  const client = useQueryClient()
  const [changeTarget, setChangeTarget] = useState<Change | null>(null)
  const form = useForm({ resolver: zodResolver(lookupSchema), mode: 'onBlur', defaultValues: { email: '' } })
  const members = useQuery({
    queryKey: ['organization-department-members', organizationId, department.id],
    queryFn: () => listDepartmentMembers(organizationId, department.id),
  })
  const lookup = useMutation({ mutationFn: ({ email }: { email: string }) => lookupDepartmentMember(organizationId, department.id, email) })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['session'] }),
    client.invalidateQueries({ queryKey: ['organization-department-members', organizationId, department.id] }),
    client.invalidateQueries({ queryKey: ['organization-departments', organizationId] }),
    client.invalidateQueries({ queryKey: ['organization-users', organizationId] }),
    client.invalidateQueries({ queryKey: ['crm-company-people'] }),
  ])
  const change = useMutation({
    mutationFn: (target: Change) => target.active
      ? upsertDepartmentMember(organizationId, department.id, target.membershipId, { isDepartmentAdmin: target.admin, version: target.version })
      : deactivateDepartmentMember(organizationId, department.id, target.membershipId, target.version!),
    onSuccess: async () => { setChangeTarget(null); lookup.reset(); await refresh() },
    onError: async () => { setChangeTarget(null); lookup.reset(); await refresh() },
  })
  const busy = change.isPending || lookup.isPending
  const canChange = !members.isPending && !members.error && department.isActive && !busy
  const activeMembers = (members.data ?? []).filter((member) => member.isActive)
  const choose = (target: Change) => { change.reset(); setChangeTarget(target) }
  const error = members.error ?? lookup.error ?? change.error
  return <Dialog open onOpenChange={(open) => { if (!busy) onOpenChange(open) }}>
    <DialogContent className="max-w-2xl" onCloseAutoFocus={(event) => {
      event.preventDefault()
      document.getElementById(`department-actions-${department.id}`)?.focus()
    }}>
      <DialogHeader>
        <DialogTitle>{m.membersTitle(department.name)}</DialogTitle>
        <DialogDescription>{m.membersDescription}</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(error)}</AlertDescription></Alert> : null}
      {changeTarget ? <section className="space-y-3" aria-live="polite">
        <p>{m.confirmAccess(changeTarget.name, changeTarget.active, changeTarget.admin)}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setChangeTarget(null)}>{m.cancelChange}</Button>
          <Button disabled={!canChange} onClick={() => change.mutate(changeTarget)}>{change.isPending ? m.saving : m.confirmAccessChange}</Button>
        </div>
      </section> : null}
      <form id="department-member-lookup" noValidate className="space-y-3" onSubmit={form.handleSubmit((values) => { setChangeTarget(null); lookup.mutate(values) })}>
        <div className="grid gap-1.5">
          <Label htmlFor="department-member-email"><RequiredFieldName>{m.lookupLabel}</RequiredFieldName></Label>
          <p id="department-member-email-description" className="text-xs text-muted-foreground">{m.lookupDescription}</p>
          <Input id="department-member-email" type="email" maxLength={255} required disabled={!canChange || Boolean(changeTarget)}
            aria-invalid={Boolean(form.formState.errors.email)}
            aria-describedby={`department-member-email-description${form.formState.errors.email ? ' department-member-email-error' : ''}`}
            {...form.register('email', { onChange: () => lookup.reset() })} />
          {form.formState.errors.email ? <p id="department-member-email-error" role="alert" className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
        </div>
        <Button type="submit" variant="outline" disabled={!canChange || Boolean(changeTarget)}>{lookup.isPending ? m.lookingUp : m.lookup}</Button>
      </form>
      {lookup.isSuccess && !lookup.data.length ? <p role="status" className="text-sm text-muted-foreground">{m.noCandidate}</p> : null}
      {lookup.data?.map((candidate) => {
        const assignment = members.data?.find((member) => member.organizationMembershipId === candidate.organizationMembershipId)
        return <div key={candidate.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 break-words"><p className="font-medium">{candidate.userName}</p><p className="text-xs text-muted-foreground">{candidate.userEmail}</p></div>
          {candidate.isOrganizationAdmin ? <p className="text-sm">{m.allDepartments}</p> : assignment?.isActive ? <p className="text-sm">{m.alreadyAssigned}</p> :
            <Button disabled={!canChange || Boolean(changeTarget)} onClick={() => choose({ membershipId: candidate.organizationMembershipId, active: true, admin: false, version: assignment?.version ?? null, name: candidate.userName })}>{m.addAccess}</Button>}
        </div>
      })}
      {members.isPending ? <p role="status">{m.loadingMembers}</p> : null}
      <div className="space-y-2" aria-busy={members.isPending}>
        {activeMembers.map((member) => <div key={member.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 break-words"><p className="font-medium">{member.userName}</p><p className="text-xs text-muted-foreground">{member.userEmail} · {member.isDepartmentAdmin ? m.departmentAdmin : m.member}</p></div>
          {member.isOrganizationAdmin ? <p className="text-sm">{m.allDepartments}</p> : <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!canChange || Boolean(changeTarget)} onClick={() => choose({ membershipId: member.organizationMembershipId, active: false, admin: false, version: member.version, name: member.userName })}>{m.removeAccess}</Button>
            <Button size="sm" variant="outline" disabled={!canChange || Boolean(changeTarget)} onClick={() => choose({ membershipId: member.organizationMembershipId, active: true, admin: !member.isDepartmentAdmin, version: member.version, name: member.userName })}>{member.isDepartmentAdmin ? m.makeMember : m.makeAdmin}</Button>
          </div>}
        </div>)}
      </div>
      {!members.isPending && !members.error && !activeMembers.length ? <p className="text-sm text-muted-foreground">{m.noMembers}</p> : null}
      <DialogFooter>
        <RequiredLegend />
        <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>{m.done}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
