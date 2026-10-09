import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { apiErrorMessage, type associateCompanyContact, type CreateCompanyContactInput } from '#/api/crm'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { CrmCollectionFeedback, type CrmCollectionQueryState } from './CrmCollectionFeedback'
import { CrmAssociationRecordCombobox } from './CrmAssociationRecordCombobox'
import { CrmRelationshipRoleSelect } from './CrmRelationshipRoleSelect'

export type CompanyPersonSubmission =
  | { kind: 'existing'; input: Parameters<typeof associateCompanyContact>[1] }
  | { kind: 'new'; input: CreateCompanyContactInput }

const contactIdentity = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(100),
  lastName: z.string().trim().min(1, 'Enter a last name.').max(100),
  email: z.string().trim().max(255).refine((value) => !value || z.email().safeParse(value).success, 'Enter a valid email address.'),
  phone: z.string().trim().max(50),
})
const associationSchema = z.object({
  mode: z.enum(['existing', 'create']),
  searchTerm: z.string(),
  contactId: z.string(),
  firstName: z.string().trim(), lastName: z.string().trim(), email: z.string().trim(), phone: z.string().trim(),
  jobTitle: z.string().trim().max(150), relationshipRole: z.string().trim().max(150),
  effectiveFrom: z.iso.date('Enter a valid start date.'),
  isPrimaryCompany: z.boolean(),
}).superRefine((values, context) => {
  if (values.mode === 'existing') {
    if (!values.contactId) context.addIssue({ code: 'custom', path: ['contactId'], message: 'Select an existing Contact or create a new one.' })
    return
  }
  const result = contactIdentity.safeParse(values)
  if (!result.success) for (const issue of result.error.issues) {
    context.addIssue({ code: 'custom', path: issue.path, message: issue.message })
  }
})
type Values = z.infer<typeof associationSchema>

function defaults(): Values {
  const today = new Date()
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return { mode: 'existing', searchTerm: '', contactId: '', firstName: '', lastName: '', email: '', phone: '',
    jobTitle: '', relationshipRole: '', effectiveFrom: date, isPrimaryCompany: false }
}

export function CrmAssociatePersonDialog({ open, companyName, excludedContactIds, pending, error,
  onOpenChange, onSubmit, onModeChange, onCloseAutoFocus, contactsQuery }: {
  contactsQuery?: CrmCollectionQueryState
  open: boolean
  companyName: string
  excludedContactIds: string[]
  pending: boolean
  error: unknown
  onOpenChange: (open: boolean) => void
  onSubmit: (submission: CompanyPersonSubmission) => void
  onModeChange: () => void
  onCloseAutoFocus: (event: Event) => void
}) {
  const form = useForm<Values>({ resolver: zodResolver(associationSchema), defaultValues: defaults(), mode: 'onTouched' })
  const { isDirty } = form.formState
  const [discard, setDiscard] = useState(false)
  const allowNavigation = useRef(false)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  const blocker = useBlocker({ withResolver: true, shouldBlockFn: () => !allowNavigation.current && (pending || isDirty), enableBeforeUnload: () => pending || isDirty })
  const confirmingDiscard = discard || blocker.status === 'blocked'
  const close = (next: boolean) => {
    if (pending) return
    if (!next && confirmingDiscard) { setDiscard(false); blocker.reset?.(); return }
    if (!next && isDirty) { setDiscard(true); return }
    onOpenChange(next)
  }
  const mode = useWatch({ control: form.control, name: 'mode' })
  const primary = useWatch({ control: form.control, name: 'isPrimaryCompany' })
  const role = useWatch({ control: form.control, name: 'relationshipRole' })
  useEffect(() => { if (open) form.reset(defaults()) }, [open, form])
  useEffect(() => {
    if (!open || confirmingDiscard) return
    if (mode === 'create') form.setFocus('firstName')
    else document.getElementById('people-association-contact')?.focus()
  }, [open, mode, form, confirmingDiscard])
  useEffect(() => { if (confirmingDiscard) keepEditingRef.current?.focus() }, [confirmingDiscard])

  const switchMode = (next: 'existing' | 'create') => {
    form.clearErrors()
    form.setValue('contactId', '')
    onModeChange()
    form.setValue('mode', next, { shouldDirty: true })
  }
  const contactsUnavailable = Boolean(contactsQuery?.isPending || contactsQuery?.isError)
  const submit = (values: Values) => {
    if (pending || contactsUnavailable) return
    const association = { jobTitle: values.jobTitle || null, relationshipRole: values.relationshipRole || null,
      isPrimaryCompany: values.isPrimaryCompany, effectiveFrom: values.effectiveFrom }
    if (values.mode === 'existing') onSubmit({ kind: 'existing', input: { ...association, contactId: values.contactId } })
    else onSubmit({ kind: 'new', input: { ...association, firstName: values.firstName, lastName: values.lastName,
      email: values.email || null, phone: values.phone || null } })
  }
  const contactError = form.formState.errors.contactId?.message
  const dateError = form.formState.errors.effectiveFrom?.message
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} showCloseButton={!pending}>
        {confirmingDiscard ? <>
          <DialogHeader><DialogTitle>Discard unsaved Contact changes?</DialogTitle></DialogHeader>
          <div><DialogDescription>Discard the Contact and Company relationship details entered for {companyName}?</DialogDescription></div>
          <DialogFooter><Button ref={keepEditingRef} variant="outline" onClick={() => { setDiscard(false); blocker.reset?.() }}>Keep editing</Button>
            <Button variant="destructive" disabled={pending} onClick={() => { allowNavigation.current = true; if (blocker.status === 'blocked') blocker.proceed(); else onOpenChange(false) }}>Discard changes</Button></DialogFooter>
        </> : <form noValidate onSubmit={form.handleSubmit(submit, (errors) => {
          if (errors.contactId) document.getElementById('people-association-contact')?.focus()
        })}>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create contact' : 'Associate contact'}</DialogTitle>
            <DialogDescription>{mode === 'create'
              ? `Create a new Contact associated with ${companyName}. This does not grant Portal access.`
              : `Find an existing Contact to associate with ${companyName}, or create one if no available match is found.`}</DialogDescription>
          </DialogHeader>
          {contactsQuery && contactsUnavailable ? <DialogFeedback><CrmCollectionFeedback name="contacts" query={contactsQuery} /></DialogFeedback> : null}
          {error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
          <fieldset disabled={pending || contactsUnavailable} className="grid gap-4">
            {mode === 'existing' ? <Field>
              <Label htmlFor="people-association-contact"><RequiredFieldName>Contact</RequiredFieldName></Label>
              <CrmAssociationRecordCombobox id="people-association-contact" name="contactId" kind="contact" required
                excludedIds={excludedContactIds} initialSearch={form.getValues('searchTerm')}
                initialValue={form.getValues('contactId') ? { id: form.getValues('contactId'), label: form.getValues('searchTerm') } : undefined}
                onSearchChange={value => form.setValue('searchTerm', value, { shouldDirty: true })}
                invalid={Boolean(contactError)} describedBy={contactError ? 'people-association-contact-error' : undefined}
                onBlur={() => { void form.trigger('contactId') }}
                onValueChange={(value) => form.setValue('contactId', value, { shouldDirty: true, shouldValidate: Boolean(contactError) })}
                onCreate={(search) => {
                  form.setValue('searchTerm', search)
                  if (z.email().safeParse(search).success && !form.getValues('email')) form.setValue('email', search)
                  switchMode('create')
                }} />
              {contactError ? <FieldError id="people-association-contact-error">{contactError}</FieldError> : null}
            </Field> : <>
              <Button type="button" variant="link" className="h-auto w-fit cursor-pointer p-0" onClick={() => switchMode('existing')}>Back to contact search</Button>
              <div className="grid gap-4 sm:grid-cols-2">
                {(['firstName', 'lastName', 'email', 'phone'] as const).map((name) => {
                  const labels = { firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone' }
                  const required = name === 'firstName' || name === 'lastName'
                  const fieldError = form.formState.errors[name]?.message
                  return <Field key={name}>
                    <Label htmlFor={`people-create-${name}`}>{required ? <RequiredFieldName>{labels[name]}</RequiredFieldName> : labels[name]}</Label>
                    <Input id={`people-create-${name}`} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
                      autoComplete={name === 'firstName' ? 'given-name' : name === 'lastName' ? 'family-name' : name === 'phone' ? 'tel' : 'email'}
                      maxLength={required ? 100 : name === 'email' ? 255 : 50} required={required}
                      aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `people-create-${name}-error` : undefined}
                      {...form.register(name)} />
                    {fieldError ? <FieldError id={`people-create-${name}-error`}>{fieldError}</FieldError> : null}
                  </Field>
                })}
              </div>
            </>}
            <Field><Label htmlFor="people-association-title">Job title</Label><Input id="people-association-title" maxLength={150} {...form.register('jobTitle')} /></Field>
            <Field><Label htmlFor="people-association-role">Relationship role</Label>
              <CrmRelationshipRoleSelect id="people-association-role" value={role}
                onValueChange={(value) => form.setValue('relationshipRole', value, { shouldDirty: true })} onBlur={() => { void form.trigger('relationshipRole') }} />
            </Field>
            <Field><Label htmlFor="people-association-date"><RequiredFieldName>Effective from</RequiredFieldName></Label>
              <Input id="people-association-date" type="date" required aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'people-association-date-error' : undefined} {...form.register('effectiveFrom')} />
              {dateError ? <FieldError id="people-association-date-error">{dateError}</FieldError> : null}
            </Field>
            <Label className="flex cursor-pointer items-center gap-2 font-normal"><Checkbox checked={primary}
              onCheckedChange={(value) => form.setValue('isPrimaryCompany', value === true, { shouldDirty: true })} />Primary Company for this Contact</Label>
          </fieldset>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || contactsUnavailable}>{pending ? 'Saving…' : mode === 'create' ? 'Create and associate contact' : 'Associate contact'}</Button>
          </RequiredDialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  )
}
