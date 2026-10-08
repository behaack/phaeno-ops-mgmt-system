import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { getTrialConfiguration, type TrialCreateRequest } from '#/api/trials'
import { TrialSourcesFields } from './TrialSourcesFields'
import { trialSourceRow, validateTrialSources } from './trial-source-schema'
import { isSubmissionDate, submissionBoundary } from './trial-submission-dates'
import { apiErrorMessage, getCrmCompany, listCrmOpportunityDepartments } from '#/api/crm'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { CrmAssociationRecordCombobox } from '#/features/crm/CrmAssociationRecordCombobox'
import { CrmCollectionFeedback } from '#/features/crm/CrmCollectionFeedback'

const creationSchema = z.object({
  companyId: z.string().min(1, 'Select a Company from the search results.'), departmentId: z.string(),
  name: z.string().trim().min(1, 'Enter a Trial name.').max(255, 'Use 255 characters or fewer.'),
  objective: z.string().trim().min(1, 'Describe the objective of this Trial.').max(4000, 'Use 4,000 characters or fewer.'),
  sampleTypeId: z.string().min(1, 'Select a sample type.'), sources: z.array(trialSourceRow),
  submissionOpensAtUtc: z.string().refine(value => isSubmissionDate(value), 'Enter the opening date.'),
  submissionClosesAtUtc: z.string().refine(value => isSubmissionDate(value), 'Enter the closing date.'),
}).superRefine((value, context) => {
  validateTrialSources(value.sources, context, true)
  if (value.submissionOpensAtUtc && value.submissionClosesAtUtc && value.submissionClosesAtUtc < value.submissionOpensAtUtc)
    context.addIssue({ code: 'custom', path: ['submissionClosesAtUtc'], message: 'Closing date cannot be before opening date.' })
})

export function TrialCreateDialog({ fromCompanyId, onClose, onSubmit }: {
  fromCompanyId?: string; onClose: () => void
  onSubmit: (values: TrialCreateRequest, key: string) => Promise<void>
}) {
  const key = useRef(crypto.randomUUID())
  const navigationApproved = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [companySearchEdited, setCompanySearchEdited] = useState(false)
  const [discard, setDiscard] = useState<(() => void) | null>(null)
  const [cancelDiscard, setCancelDiscard] = useState<(() => void) | null>(null)
  const company = useQuery({ queryKey: ['crm-company', fromCompanyId], queryFn: () => getCrmCompany(fromCompanyId!), enabled: Boolean(fromCompanyId) })
  const configuration = useQuery({ queryKey: ['trial-create-configuration'], queryFn: () => getTrialConfiguration() })
  const form = useForm({ resolver: zodResolver(creationSchema), defaultValues: { companyId: fromCompanyId ?? '', departmentId: '', name: '', objective: '', sampleTypeId: '', sources: [{ biologicalSource: '', specimenCount: 1 as number | null }], submissionOpensAtUtc: '', submissionClosesAtUtc: '' } })
  const sources = useFieldArray({ control: form.control, name: 'sources' })
  const sourceValues = useWatch({ control: form.control, name: 'sources' })
  const total = sourceValues.reduce((sum, source) => sum + (Number(source.specimenCount) || 0), 0)
  const companyId = useWatch({ control: form.control, name: 'companyId' })
  const departments = useQuery({ queryKey: ['crm-opportunity-departments', companyId], queryFn: () => listCrmOpportunityDepartments(companyId), enabled: Boolean(companyId) })
  const choices = departments.data ?? []
  const required = choices.length > 1
  const dirty = form.formState.isDirty || companySearchEdited
  const busy = form.formState.isSubmitting
  const unavailable = Boolean(fromCompanyId && !company.data) || Boolean(companyId && (departments.isFetching || !departments.isSuccess))
  useBlocker({
    shouldBlockFn: () => {
      if (navigationApproved.current) return false
      if (busy) return true
      if (!dirty) return false
      return new Promise<boolean>(resolve => { setDiscard(() => () => { navigationApproved.current = true; resolve(false) }); setCancelDiscard(() => () => resolve(true)) })
    },
    enableBeforeUnload: () => !navigationApproved.current && (busy || dirty),
  })
  function close() {
    if (busy) return
    if (dirty) { setDiscard(() => () => { navigationApproved.current = true; onClose() }); setCancelDiscard(null) }
    else onClose()
  }
  function cancel() { cancelDiscard?.(); setDiscard(null); setCancelDiscard(null) }
  return <>
    <Dialog open onOpenChange={open => { if (!open) close() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Create Trial project</DialogTitle><DialogDescription>Describe the no-charge evaluation, planned samples and submission window. These details start a scope draft; complete its scientific requirements before submitting it.</DialogDescription></DialogHeader>
        {error ? <DialogFeedback><p role="alert">{error}</p></DialogFeedback> : null}
        <form noValidate aria-busy={busy} onSubmit={form.handleSubmit(async values => {
          if (unavailable) return
          if (!configuration.data?.sampleTypes.some(type => type.id === values.sampleTypeId)) { form.setError('sampleTypeId', { message: 'Select a current extracted RNA sample type.' }); return }
          const departmentId = choices.length === 1 ? choices[0].id : values.departmentId
          if (required && !choices.some(value => value.id === departmentId)) { form.setError('departmentId', { message: 'Select the Department this Trial belongs to.' }); return }
          setError(null)
          try { await onSubmit({ companyId: values.companyId, departmentId: departmentId || null, name: values.name, objective: values.objective,
            sampleTypeId: values.sampleTypeId, sources: values.sources, submissionOpensAtUtc: submissionBoundary(values.submissionOpensAtUtc),
            submissionClosesAtUtc: submissionBoundary(values.submissionClosesAtUtc, true) }, key.current); navigationApproved.current = true; onClose() }
          catch (failure) { setError(apiErrorMessage(failure)) }
        })}>
          <fieldset disabled={busy} className="space-y-4">
            <Field><Label htmlFor="trial-name"><RequiredFieldName>Trial name</RequiredFieldName></Label><Input id="trial-name" maxLength={255} {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} aria-describedby="trial-name-error" /><FieldError id="trial-name-error">{form.formState.errors.name?.message}</FieldError></Field>
            {fromCompanyId ? <CrmCollectionFeedback name="Company" query={company} /> : null}
            <Field><Label htmlFor="trial-company"><RequiredFieldName>Company</RequiredFieldName></Label>
              {!fromCompanyId || company.data ? <Controller control={form.control} name="companyId" render={({ field }) => <CrmAssociationRecordCombobox id="trial-company" name={field.name} kind="company" required portal
                inputRef={field.ref} onSearchChange={value => setCompanySearchEdited(value !== (company.data?.name ?? ''))}
                initialValue={company.data ? { id: company.data.id, label: company.data.name } : undefined}
                onValueChange={value => { field.onChange(value); form.setValue('departmentId', ''); form.clearErrors('departmentId') }} invalid={Boolean(form.formState.errors.companyId)} describedBy="trial-company-error" />} /> : null}
              <FieldError id="trial-company-error">{form.formState.errors.companyId?.message}</FieldError>
            </Field>
            {companyId ? <CrmCollectionFeedback name="Company departments" query={departments} /> : null}
            {departments.isSuccess && choices.length > 0 ? <Field><Label htmlFor="trial-department">{required ? <RequiredFieldName>Department</RequiredFieldName> : 'Department'}</Label>
              <FieldDescription>{required ? 'Choose the Department this Trial belongs to.' : "The Company's only active Department is selected automatically."}</FieldDescription>
              <NativeSelect id="trial-department" required={required} disabled={choices.length === 1} {...form.register('departmentId')} value={choices.length === 1 ? choices[0].id : form.watch('departmentId')} aria-invalid={Boolean(form.formState.errors.departmentId)} aria-describedby="trial-department-error">
                {required ? <option value="">Select a Department</option> : null}{choices.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
              </NativeSelect><FieldError id="trial-department-error">{form.formState.errors.departmentId?.message}</FieldError>
            </Field> : null}
            {companyId && departments.isSuccess && choices.length === 0 ? <p className="text-sm text-muted-foreground">No active departments. You can create the draft now; Prospect access and a Department must be prepared before submitting scope for approval.</p> : null}
            <Field><Label htmlFor="trial-objective"><RequiredFieldName>Objective / Description</RequiredFieldName></Label><Textarea id="trial-objective" rows={3} maxLength={4000} {...form.register('objective')} aria-invalid={Boolean(form.formState.errors.objective)} aria-describedby="trial-objective-error" /><FieldError id="trial-objective-error">{form.formState.errors.objective?.message}</FieldError></Field>
            <CrmCollectionFeedback name="Trial sample types" query={configuration} />
            <Field><Label htmlFor="trial-sample-type"><RequiredFieldName>Sample type</RequiredFieldName></Label><NativeSelect id="trial-sample-type" {...form.register('sampleTypeId')} aria-invalid={Boolean(form.formState.errors.sampleTypeId)} aria-describedby="trial-sample-type-error"><option value="">Select sample type</option>{configuration.data?.sampleTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</NativeSelect><FieldError id="trial-sample-type-error">{form.formState.errors.sampleTypeId?.message}</FieldError><FieldDescription>Trials accept extracted RNA. The selected type supplies quantity and shipping requirements.</FieldDescription></Field>
            <TrialSourcesFields prefix="trial-create" total={total} rows={sources.fields.map((source, index) => ({ id: source.id, source: form.register(`sources.${index}.biologicalSource`), quantity: form.register(`sources.${index}.specimenCount`, { setValueAs: value => value === '' || value == null ? null : Number(value) }), sourceError: form.formState.errors.sources?.[index]?.biologicalSource?.message, quantityError: form.formState.errors.sources?.[index]?.specimenCount?.message }))} error={form.formState.errors.sources?.root?.message ?? form.formState.errors.sources?.message} onAdd={() => sources.append({ biologicalSource: '', specimenCount: 1 })} onRemove={index => sources.remove(index)} />
            <fieldset className="space-y-2"><legend className="text-sm font-medium">Submission window</legend><p className="text-sm text-muted-foreground">The closing date is included.</p><div className="grid gap-4 sm:grid-cols-2">
              <Field><Label htmlFor="trial-opens"><RequiredFieldName>Submission opens</RequiredFieldName></Label><Input id="trial-opens" type="date" {...form.register('submissionOpensAtUtc')} aria-invalid={Boolean(form.formState.errors.submissionOpensAtUtc)} aria-describedby="trial-opens-error" /><FieldError id="trial-opens-error">{form.formState.errors.submissionOpensAtUtc?.message}</FieldError></Field>
              <Field><Label htmlFor="trial-closes"><RequiredFieldName>Submission closes</RequiredFieldName></Label><Input id="trial-closes" type="date" {...form.register('submissionClosesAtUtc')} aria-invalid={Boolean(form.formState.errors.submissionClosesAtUtc)} aria-describedby="trial-closes-error" /><FieldError id="trial-closes-error">{form.formState.errors.submissionClosesAtUtc?.message}</FieldError></Field>
            </div></fieldset>
          </fieldset>
          <DialogFooter><RequiredLegend className="mr-auto" /><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" disabled={busy || unavailable}>{busy ? 'Creating…' : 'Create Trial project'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(discard)} onOpenChange={open => { if (!open) cancel() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('keep-trial-draft')?.focus() }}>
      <DialogHeader><DialogTitle>Discard unsaved Trial project?</DialogTitle></DialogHeader><div><DialogDescription>Your Trial details and Company and Department selections will be discarded. No Trial has been created.</DialogDescription></div>
      <DialogFooter><Button id="keep-trial-draft" variant="outline" onClick={cancel}>Keep editing</Button><Button variant="destructive" onClick={() => { discard?.(); setDiscard(null); setCancelDiscard(null) }}>Discard changes</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
