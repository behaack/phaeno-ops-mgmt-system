import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage, listDepartments, listInvitations, updateInvitationAccess, type Invitation } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const schema = z.object({
  role: z.enum(['Member', 'Administrator']),
  departments: z.array(z.object({ departmentId: z.string(), isDepartmentAdmin: z.boolean() })),
}).superRefine((values, context) => {
  if (values.role === 'Member' && !values.departments.length)
    context.addIssue({ code: 'custom', path: ['departments'], message: 'Select at least one department.' })
})
type Values = z.infer<typeof schema>
const valuesFor = (invitation: Invitation): Values => ({
  role: invitation.isOrganizationAdmin ? 'Administrator' : 'Member',
  departments: invitation.departments.map(({ departmentId, isDepartmentAdmin }) => ({ departmentId, isDepartmentAdmin })),
})

export function InvitationAccessDialog({ invitation, onClose, onSaved, returnFocusTo }: {
  returnFocusTo?: HTMLElement | null
  invitation: Invitation
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const keepEditingButton = useRef<HTMLButtonElement>(null)
  const reloadButton = useRef<HTMLButtonElement>(null)
  const roleField = useRef<HTMLFieldSetElement>(null)
  const [source, setSource] = useState(invitation)
  const [discard, setDiscard] = useState(false)
  const [conflict, setConflict] = useState(false)
  const departments = useQuery({ queryKey: ['organization-departments', source.organizationId, false], queryFn: () => listDepartments(source.organizationId, false) })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(source) })
  const role = form.watch('role')
  const selected = form.watch('departments')
  const active = (departments.data ?? []).filter(value => value.isActive)
  const defaultDepartment = active.find(value => value.isDefault)
  const accessError = role === 'Administrator'
    ? !defaultDepartment ? 'An active default department is required.' : undefined
    : !selected.length ? 'Select at least one department.'
      : selected.some(value => !active.some(department => department.id === value.departmentId)) ? 'A selected department is no longer available. Review your department selections.' : undefined
  const save = useMutation({
    mutationFn: (values: Values) => updateInvitationAccess(source.id, {
      version: source.version, isOrganizationAdmin: values.role === 'Administrator',
      departments: values.role === 'Administrator' ? [] : values.departments,
    }),
    onSuccess: async () => { await onSaved(); onClose() },
    onError: error => { if (isAxiosError(error) && error.response?.status === 409) setConflict(true) },
  })
  const reload = useMutation({
    mutationFn: () => listInvitations(source.organizationId),
    onSuccess: values => {
      const latest = values.find(value => value.id === source.id)
      if (!latest) { onClose(); return }
      setSource(latest); form.reset(valuesFor(latest)); setConflict(false); save.reset()
    },
  })
  const pending = save.isPending || reload.isPending
  useEffect(() => {
    if (discard) keepEditingButton.current?.focus()
    else if (conflict && !pending) reloadButton.current?.focus()
  }, [discard, conflict, pending])
  useEffect(() => {
    if (reload.isSuccess && !conflict) roleField.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [reload.isSuccess, conflict])
  const close = () => { if (pending) return; if (form.formState.isDirty) setDiscard(true); else onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="max-w-2xl" onCloseAutoFocus={event => { if (returnFocusTo?.isConnected) { event.preventDefault(); returnFocusTo.focus() } }}>
      <form className="space-y-4" onSubmit={form.handleSubmit(values => { if (!accessError && !conflict) save.mutate(values) })}>
        <DialogHeader>
          <DialogTitle>Edit invited access</DialogTitle>
          <DialogDescription>{source.firstName} {source.lastName} · {source.email}. Changes apply when this invitation is accepted. The existing invitation link and expiry are preserved.</DialogDescription>
        </DialogHeader>
        {source.isExpired ? <p role="status" className="text-sm text-muted-foreground">This invitation has expired. Saving access does not renew it; resend it afterward if access is still needed.</p> : null}
        {source.status !== 'Pending' ? <Alert><AlertDescription>This invitation is no longer pending and cannot be edited.</AlertDescription></Alert> : null}
        {conflict ? <Alert variant="destructive"><AlertDescription>The invitation changed while you were editing. Your selections are preserved. Reload to replace them with the latest saved access before editing again.<Button ref={reloadButton} type="button" variant="outline" className="mt-2" disabled={pending} onClick={() => reload.mutate()}>Reload invitation</Button></AlertDescription></Alert>
          : save.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(save.error)}</AlertDescription></Alert> : null}
        {reload.error || departments.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(reload.error ?? departments.error)}{departments.error ? <Button type="button" variant="outline" onClick={() => void departments.refetch()}>Retry departments</Button> : null}</AlertDescription></Alert> : null}
        {discard ? <section role="alert" className="space-y-2"><p>Discard your unsaved invitation changes?</p><div className="flex gap-2"><Button ref={keepEditingButton} type="button" variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={onClose}>Discard changes</Button></div></section> : null}
        <fieldset disabled={pending || source.status !== 'Pending'} className="space-y-4">
          <fieldset ref={roleField} className="space-y-2"><legend className="mb-2 text-sm font-medium"><RequiredFieldName>Access after acceptance</RequiredFieldName></legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" value="Member" {...form.register('role')} />Member — assigned departments only</label>
            <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" value="Administrator" {...form.register('role')} />Organization administrator — all departments</label>
          </fieldset>
          {departments.isPending ? <p role="status">Loading departments…</p> : null}
          {role === 'Member' ? <fieldset className="space-y-3 rounded-lg border p-3" aria-describedby={accessError ? 'invited-access-error' : undefined}>
            <legend className="px-1 text-sm font-medium"><RequiredFieldName>Department access</RequiredFieldName></legend>
            {active.map(department => {
              const intent = selected.find(value => value.departmentId === department.id)
              return <div key={department.id} className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(intent)} onChange={event => {
                  const available = selected.filter(value => active.some(entry => entry.id === value.departmentId))
                  form.setValue('departments', event.target.checked ? [...available, { departmentId: department.id, isDepartmentAdmin: false }] : available.filter(value => value.departmentId !== department.id), { shouldDirty: true })
                }} />{department.name}</label>
                {intent ? <label className="flex cursor-pointer items-center gap-2 pl-5 text-sm"><input type="checkbox" checked={intent.isDepartmentAdmin} onChange={event => form.setValue('departments', selected.map(value => value.departmentId === department.id ? { ...value, isDepartmentAdmin: event.target.checked } : value), { shouldDirty: true })} />Department administrator for {department.name}</label> : null}
              </div>
            })}
          </fieldset> : null}
          {accessError && !departments.isPending ? <p id="invited-access-error" role="alert" className="text-sm text-destructive">{accessError}</p> : null}
        </fieldset>
        <RequiredDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button>
          <Button type="submit" disabled={pending || !form.formState.isDirty || Boolean(accessError) || conflict || departments.isPending || Boolean(departments.error) || source.status !== 'Pending'}>{save.isPending ? 'Saving…' : 'Save invited access'}</Button>
        </RequiredDialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
