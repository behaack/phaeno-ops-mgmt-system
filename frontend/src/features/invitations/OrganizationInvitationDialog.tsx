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

export function OrganizationInvitationDialog({ organizationId, organizationName, error, isPending, onOpenChange, onSubmit, contact }: {
  organizationId: string
  organizationName?: string
  error: unknown
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: OrganizationInviteValues) => Promise<unknown>
  contact?: { firstName: string; lastName: string; email: string }
}) {
  const departments = useQuery({
    queryKey: ['organization-departments', organizationId, false],
    queryFn: () => listDepartments(organizationId, false),
  })
  const [openingTrigger] = useState(() => typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const [dirty, setDirty] = useState(false)
  const [accessReady, setAccessReady] = useState(false)
  const [discard, setDiscard] = useState(false)
  const close = () => { if (!isPending) { if (dirty) setDiscard(true); else onOpenChange(false) } }
  return <Dialog open onOpenChange={(open) => { if (!open) close() }}>
    <DialogContent className="max-w-xl" onCloseAutoFocus={(event) => {
      const trigger = document.getElementById('add-organization-user') ?? openingTrigger
      if (trigger?.isConnected) { event.preventDefault(); trigger.focus() }
    }}>
      <DialogHeader><DialogTitle>{contact ? m.inviteContactTitle(`${contact.firstName} ${contact.lastName}`.trim()) : m.inviteTitle}</DialogTitle><DialogDescription>{m.inviteDescription}</DialogDescription></DialogHeader>
      {error || departments.error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(error ?? departments.error)}</AlertDescription></Alert> : null}
      {discard ? <section role="alert" className="space-y-3">
        <p>{m.discardInvitation}</p><div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDiscard(false)}>{m.keepEditing}</Button>
          <Button variant="destructive" onClick={() => onOpenChange(false)}>{m.discard}</Button>
        </div>
      </section> : null}
      {departments.isPending ? <p role="status">{m.loadingDepartments}</p> : null}
      {departments.error ? <Button variant="outline" onClick={() => void departments.refetch()}>{m.retry}</Button> : null}
      {departments.data ? <InvitationForm departments={departments.data} pending={isPending} contact={contact} organizationName={organizationName}
        onAccessReady={setAccessReady}
        onDirty={setDirty} onSubmit={async (values) => {
          try { await onSubmit(values) } catch { await departments.refetch() }
        }} /> : null}
      <RequiredDialogFooter showLegend={Boolean(departments.data)}>
        <Button type="button" variant="outline" disabled={isPending} onClick={close}>{m.cancel}</Button>
        {departments.data ? <Button type="submit" form="invite-organization-user" disabled={isPending || Boolean(departments.error) || !accessReady}>{isPending ? m.sending : m.sendInvitation}</Button> : null}
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function InvitationForm({ departments, pending, onDirty, onSubmit, contact, organizationName, onAccessReady }: {
  departments: Department[]
  pending: boolean
  onAccessReady: (ready: boolean) => void
  onDirty: (dirty: boolean) => void
  onSubmit: (values: OrganizationInviteValues) => Promise<void>
  contact?: { firstName: string; lastName: string; email: string }
  organizationName?: string
}) {
  const defaultDepartment = departments.find((department) => department.isDefault && department.isActive)
  const form = useForm<OrganizationInviteValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: {
    firstName: contact?.firstName ?? '', lastName: contact?.lastName ?? '', email: contact?.email ?? '', role: 'Member',
    departments: defaultDepartment ? [{ departmentId: defaultDepartment.id, isDepartmentAdmin: false }] : [],
  } })
  const { isDirty } = form.formState
  useEffect(() => onDirty(isDirty), [isDirty, onDirty])
  const selected = form.watch('departments')
  const role = form.watch('role')
  const activeDepartments = departments.filter((department) => department.isActive)
  const accessError = role === 'Administrator'
    ? !defaultDepartment ? m.noInviteDepartments : undefined
    : selected.length === 0 ? m.selectDepartments
      : selected.some(entry => !activeDepartments.some(department => department.id === entry.departmentId)) ? m.reviewChangedDepartments : undefined
  const departmentError = role === 'Member' ? accessError : undefined
  useEffect(() => onAccessReady(!accessError), [accessError, onAccessReady])
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
      {contact ? <section aria-label={m.invitationRecipient} className="grid gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium">{contact.firstName} {contact.lastName}</p>
        <p className="break-words text-muted-foreground">{contact.email}</p>
        {organizationName ? <p className="break-words text-muted-foreground">{organizationName}</p> : null}
        {(['firstName', 'lastName', 'email'] as const).map(field => form.formState.errors[field]
          ? <p key={field} role="alert" className="text-xs text-destructive">{form.formState.errors[field]?.message}</p> : null)}
      </section> : <>
      {organizationName ? <p className="text-sm">{m.invitationOrganization}: <span className="font-medium">{organizationName}</span></p> : null}
      {(['firstName', 'lastName', 'email'] as const).map((field) => <div key={field} className="grid gap-1.5">
        <Label htmlFor={`organization-invite-${field}`}><RequiredFieldName>{m[field]}</RequiredFieldName></Label>
        <Input id={`organization-invite-${field}`} required readOnly={Boolean(contact)} type={field === 'email' ? 'email' : 'text'} maxLength={field === 'email' ? 255 : 100}
          autoComplete={field === 'firstName' ? 'given-name' : field === 'lastName' ? 'family-name' : 'email'}
          aria-invalid={Boolean(form.formState.errors[field])} aria-describedby={form.formState.errors[field] ? `organization-invite-${field}-error` : undefined}
          {...form.register(field)} />
        {form.formState.errors[field] ? <p id={`organization-invite-${field}-error`} role="alert" className="text-xs text-destructive">{form.formState.errors[field]?.message}</p> : null}
      </div>)}
      </>}
      <section aria-labelledby="invitation-access-heading" className="grid gap-3">
        <h3 id="invitation-access-heading" className="text-sm font-semibold">{m.invitationAccess}</h3>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm"><RequiredFieldName>{m.role}</RequiredFieldName></legend>
          {([['Member', m.member, m.memberDescription], ['Administrator', m.organizationAdmin, m.organizationAdminDescription]] as const).map(([value, label, description]) =>
            <div key={value} className="grid gap-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="radio" value={value} required aria-describedby={`invitation-role-${value}-help`} {...form.register('role')} />{label}
              </label>
              <p id={`invitation-role-${value}-help`} className="pl-5 text-xs text-muted-foreground">{description}</p>
            </div>)}
        </fieldset>
      {role !== 'Administrator' ?
        <fieldset id="organization-invite-departments" tabIndex={-1} aria-invalid={Boolean(departmentError)} aria-describedby={departmentError ? 'organization-invite-departments-error' : undefined} className="rounded-lg border px-3 pb-3 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <legend className="px-1 text-sm"><RequiredFieldName>{m.invitationDepartments}</RequiredFieldName></legend>
          <div className="grid gap-3">
          {activeDepartments.map((department) => {
            const intent = selected.find((value) => value.departmentId === department.id)
            return <div key={department.id} className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(intent)} onChange={(event) => {
                  const availableSelected = selected.filter((value) => activeDepartments.some((entry) => entry.id === value.departmentId))
                  form.setValue('departments', event.target.checked ? [...availableSelected, { departmentId: department.id, isDepartmentAdmin: false }] : availableSelected.filter((value) => value.departmentId !== department.id), { shouldDirty: true, shouldValidate: Boolean(departmentError) })
                }} />{department.isDefault ? m.defaultDepartment(department.name) : department.name}
              </label>
              {intent ? <label className="flex cursor-pointer items-center gap-2 pl-5 text-sm">
                <input type="checkbox" checked={intent.isDepartmentAdmin} onChange={(event) => form.setValue('departments', selected.map((value) => value.departmentId === department.id ? { ...value, isDepartmentAdmin: event.target.checked } : value), { shouldDirty: true })} />{m.departmentAdminFor(department.name)}
              </label> : null}
            </div>
          })}
          </div>
          {departmentError ? <p id="organization-invite-departments-error" role="alert" className="text-xs text-destructive">{departmentError}</p> : null}
        </fieldset> : null}
      </section>
      {role === 'Administrator' && accessError ? <p role="status" className="text-sm text-muted-foreground">{accessError}</p> : null}
    </fieldset>
  </form>
}
