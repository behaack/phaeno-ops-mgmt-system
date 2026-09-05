import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { listDepartments, type Department } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { departmentErrorMessage, departmentMessages as m } from '#/features/organizations/department-localization'

const schema = z.object({
  firstName: z.string().trim().min(1, m.firstNameRequired).max(100, m.tooLong(100)),
  lastName: z.string().trim().min(1, m.lastNameRequired).max(100, m.tooLong(100)),
  email: z.string().trim().max(255, m.tooLong(255)).email(m.validEmail),
  role: z.enum(['Member', 'Administrator']),
  departments: z.array(z.object({ departmentId: z.string(), isDepartmentAdmin: z.boolean() })),
}).superRefine((values, context) => {
  if (values.role === 'Member' && values.departments.length === 0) context.addIssue({ code: 'custom', path: ['departments'], message: m.selectDepartments })
})
export type OrganizationInviteValues = z.infer<typeof schema>

export function OrganizationInvitationDialog({ organizationId, error, isPending, onOpenChange, onSubmit }: {
  organizationId: string
  error: unknown
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OrganizationInviteValues) => Promise<unknown>
}) {
  const departments = useQuery({
    queryKey: ['organization-departments', organizationId, false],
    queryFn: () => listDepartments(organizationId, false),
  })
  const [dirty, setDirty] = useState(false)
  const [discard, setDiscard] = useState(false)
  const close = () => { if (!isPending) { if (dirty) setDiscard(true); else onOpenChange(false) } }
  return <Dialog open onOpenChange={(open) => { if (!open) close() }}>
    <DialogContent className="max-w-xl" onCloseAutoFocus={(event) => {
      event.preventDefault()
      document.getElementById('add-organization-user')?.focus()
    }}>
      <DialogHeader><DialogTitle>{m.inviteTitle}</DialogTitle><DialogDescription>{m.inviteDescription}</DialogDescription></DialogHeader>
      {error || departments.error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(error ?? departments.error)}</AlertDescription></Alert> : null}
      {discard ? <section role="alert" className="space-y-3">
        <p>{m.discardInvitation}</p><div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDiscard(false)}>{m.keepEditing}</Button>
          <Button variant="destructive" onClick={() => onOpenChange(false)}>{m.discard}</Button>
        </div>
      </section> : null}
      {departments.isPending ? <p role="status">{m.loadingDepartments}</p> : null}
      {departments.error ? <Button variant="outline" onClick={() => void departments.refetch()}>{m.retry}</Button> : null}
      {departments.data ? <InvitationForm departments={departments.data} pending={isPending}
        onDirty={setDirty} onSubmit={async (values) => {
          try { await onSubmit(values) } catch { await departments.refetch() }
        }} /> : null}
      <RequiredDialogFooter showLegend={Boolean(departments.data)}>
        <Button type="button" variant="outline" disabled={isPending} onClick={close}>{m.cancel}</Button>
        {departments.data ? <Button type="submit" form="invite-organization-user" disabled={isPending || Boolean(departments.error) || !departments.data.some((department) => department.isActive)}>{isPending ? m.sending : m.sendInvitation}</Button> : null}
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function InvitationForm({ departments, pending, onDirty, onSubmit }: {
  departments: Department[]
  pending: boolean
  onDirty: (dirty: boolean) => void
  onSubmit: (values: OrganizationInviteValues) => Promise<void>
}) {
  const defaultDepartment = departments.find((department) => department.isDefault && department.isActive)
  const form = useForm<OrganizationInviteValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: {
    firstName: '', lastName: '', email: '', role: 'Member',
    departments: defaultDepartment ? [{ departmentId: defaultDepartment.id, isDepartmentAdmin: false }] : [],
  } })
  const { isDirty } = form.formState
  useEffect(() => onDirty(isDirty), [isDirty, onDirty])
  const selected = form.watch('departments')
  const role = form.watch('role')
  const activeDepartments = departments.filter((department) => department.isActive)
  const departmentError = form.formState.errors.departments?.message
  const submit = form.handleSubmit(async (values) => {
    const intent = values.role === 'Administrator'
      ? defaultDepartment ? [{ departmentId: defaultDepartment.id, isDepartmentAdmin: false }] : []
      : values.departments
    if (!intent.length || intent.some((entry) => !activeDepartments.some((department) => department.id === entry.departmentId))) {
      form.setError('departments', { message: m.reviewChangedDepartments })
      document.getElementById('organization-invite-departments')?.focus()
      return
    }
    await onSubmit({ ...values, departments: intent })
  }, (errors) => {
    if (errors.departments && !errors.firstName && !errors.lastName && !errors.email) document.getElementById('organization-invite-departments')?.focus()
  })
  return <form id="invite-organization-user" noValidate onSubmit={submit}>
    <fieldset disabled={pending} className="grid gap-4">
      {(['firstName', 'lastName', 'email'] as const).map((field) => <div key={field} className="grid gap-1.5">
        <Label htmlFor={`organization-invite-${field}`}><RequiredFieldName>{m[field]}</RequiredFieldName></Label>
        <Input id={`organization-invite-${field}`} required type={field === 'email' ? 'email' : 'text'} maxLength={field === 'email' ? 255 : 100}
          autoComplete={field === 'firstName' ? 'given-name' : field === 'lastName' ? 'family-name' : 'email'}
          aria-invalid={Boolean(form.formState.errors[field])} aria-describedby={form.formState.errors[field] ? `organization-invite-${field}-error` : undefined}
          {...form.register(field)} />
        {form.formState.errors[field] ? <p id={`organization-invite-${field}-error`} role="alert" className="text-xs text-destructive">{form.formState.errors[field]?.message}</p> : null}
      </div>)}
      <div className="grid gap-1.5">
        <Label htmlFor="organization-invite-role"><RequiredFieldName>{m.role}</RequiredFieldName></Label>
        <select id="organization-invite-role" required className="h-9 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('role')}>
          <option value="Member">{m.member}</option><option value="Administrator">{m.organizationAdmin}</option>
        </select>
      </div>
      {role === 'Administrator' ? <p className="text-sm text-muted-foreground">{m.organizationAdminDescription}</p> :
        <fieldset id="organization-invite-departments" tabIndex={-1} aria-invalid={Boolean(departmentError)} aria-describedby={departmentError ? 'organization-invite-departments-error' : undefined} className="space-y-3 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <legend><RequiredFieldName>{m.invitationDepartments}</RequiredFieldName></legend>
          {activeDepartments.map((department) => {
            const intent = selected.find((value) => value.departmentId === department.id)
            return <div key={department.id} className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(intent)} onChange={(event) => {
                  const availableSelected = selected.filter((value) => activeDepartments.some((entry) => entry.id === value.departmentId))
                  form.setValue('departments', event.target.checked ? [...availableSelected, { departmentId: department.id, isDepartmentAdmin: false }] : availableSelected.filter((value) => value.departmentId !== department.id), { shouldDirty: true, shouldValidate: Boolean(departmentError) })
                }} />{department.isDefault ? m.defaultDepartment(department.name) : department.name}
              </label>
              {intent ? <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={intent.isDepartmentAdmin} onChange={(event) => form.setValue('departments', selected.map((value) => value.departmentId === department.id ? { ...value, isDepartmentAdmin: event.target.checked } : value), { shouldDirty: true })} />{m.departmentAdminFor(department.name)}
              </label> : null}
            </div>
          })}
          {departmentError ? <p id="organization-invite-departments-error" role="alert" className="text-xs text-destructive">{departmentError}</p> : null}
        </fieldset>}
      {!activeDepartments.length ? <p role="status" className="text-sm text-muted-foreground">{m.noInviteDepartments}</p> : null}
    </fieldset>
  </form>
}
