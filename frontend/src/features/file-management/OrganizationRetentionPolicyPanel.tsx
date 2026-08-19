import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import {
  fileManagementErrorMessage,
  getOrganizationReleasedDeliverablePolicy,
  removeOrganizationReleasedDeliverablePolicyOverride,
  upsertOrganizationReleasedDeliverablePolicyOverride,
  type EffectiveReleasedDeliverablePolicy,
  type OrganizationReleasedDeliverablePolicy,
} from '#/api/file-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const optionalPositiveDays = z.string().trim().refine(
  (value) => value === '' || (/^\d+$/.test(value) && Number(value) > 0),
  'Enter a positive whole number of days or leave this blank to inherit.',
)
const overrideSchema = z.object({
  standardRetentionDays: optionalPositiveDays,
  undownloadedWarningLeadDays: optionalPositiveDays,
  undownloadedGraceDays: optionalPositiveDays,
  reason: z.string().trim().min(1, 'Enter a reason for this change.').max(2000, 'Keep the reason to 2,000 characters or fewer.'),
}).superRefine((values, context) => {
  if (!values.standardRetentionDays && !values.undownloadedWarningLeadDays && !values.undownloadedGraceDays) {
    context.addIssue({ code: 'custom', path: ['standardRetentionDays'], message: 'Override at least one value, or remove the override to inherit all global values.' })
  }
})
const removalSchema = z.object({
  reason: z.string().trim().min(1, 'Enter a reason for removing this override.').max(2000),
})

type OverrideFormValues = z.infer<typeof overrideSchema>
type RemovalFormValues = z.infer<typeof removalSchema>

export function OrganizationRetentionPolicyPanel({
  enabled,
  organizationId,
  organizationName,
}: {
  enabled: boolean
  organizationId: string
  organizationName: string
}) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const queryKey = ['organization-released-deliverable-policy', organizationId]
  const query = useQuery({
    queryKey,
    queryFn: () => getOrganizationReleasedDeliverablePolicy(organizationId),
    enabled,
  })
  const overrideForm = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: emptyOverride,
  })
  const removalForm = useForm<RemovalFormValues>({
    resolver: zodResolver(removalSchema),
    defaultValues: { reason: '' },
  })
  const upsert = useMutation({
    mutationFn: (values: OverrideFormValues) => {
      const configuration = query.data!
      const standardRetentionDays = readOptionalDays(values.standardRetentionDays)
      const warningDays = readOptionalDays(values.undownloadedWarningLeadDays)
      const graceDays = readOptionalDays(values.undownloadedGraceDays)
      const resolvedRetention = standardRetentionDays ?? configuration.global.values.standardRetentionDays
      const resolvedWarning = warningDays ?? configuration.global.values.undownloadedWarningLeadDays
      if (resolvedWarning >= resolvedRetention) {
        overrideForm.setError('undownloadedWarningLeadDays', {
          message: 'The effective warning lead must be shorter than the effective standard retention.',
        })
        throw new LocalValidationError()
      }

      return upsertOrganizationReleasedDeliverablePolicyOverride(organizationId, {
        standardRetentionDays,
        undownloadedWarningLeadDays: warningDays,
        undownloadedGraceDays: graceDays,
        reason: values.reason.trim(),
        globalVersion: configuration.global.version,
        overrideVersion: configuration.override?.version ?? null,
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      setEditOpen(false)
      setSavedMessage('Organization override saved. Existing released packages keep their snapshotted deadlines.')
    },
  })
  const remove = useMutation({
    mutationFn: (values: RemovalFormValues) => removeOrganizationReleasedDeliverablePolicyOverride(
      organizationId,
      { reason: values.reason.trim(), version: query.data!.override!.version },
    ),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      setRemoveOpen(false)
      setSavedMessage('Organization override removed. Future releases now inherit every global value.')
    },
  })

  function openEditor(configuration: OrganizationReleasedDeliverablePolicy) {
    overrideForm.reset({
      standardRetentionDays: optionalValue(configuration.override?.standardRetentionDays),
      undownloadedWarningLeadDays: optionalValue(configuration.override?.undownloadedWarningLeadDays),
      undownloadedGraceDays: optionalValue(configuration.override?.undownloadedGraceDays),
      reason: '',
    })
    upsert.reset()
    setSavedMessage(null)
    setEditOpen(true)
  }

  function openRemoval() {
    removalForm.reset({ reason: '' })
    remove.reset()
    setSavedMessage(null)
    setRemoveOpen(true)
  }

  if (!enabled) return null
  if (query.isLoading) return <p role="status">Loading retention policy…</p>
  if (query.error) return <Alert variant="destructive"><AlertTitle>Retention policy could not be loaded</AlertTitle><AlertDescription>{fileManagementErrorMessage(query.error, 'Try refreshing this account.')}</AlertDescription></Alert>
  if (!query.data) return null

  const configuration = query.data
  return (
    <div className="space-y-5">
      {savedMessage ? <Alert><AlertTitle>Retention configuration updated</AlertTitle><AlertDescription>{savedMessage}</AlertDescription></Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">Released-deliverable retention</h2>
          <p className="mt-1 text-sm text-muted-foreground">The effective values below apply only to future packages released for {organizationName}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {configuration.override ? <Button type="button" size="sm" variant="outline" onClick={openRemoval}><RotateCcw data-icon="inline-start" />Remove override</Button> : null}
          <Button type="button" size="sm" onClick={() => openEditor(configuration)}><Pencil data-icon="inline-start" />{configuration.override ? 'Edit override' : 'Add override'}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <EffectiveValue label="Standard retention" value={configuration.effective.standardRetentionDays} source={configuration.effective.standardRetentionSource} />
        <EffectiveValue label="Undownloaded warning lead" value={configuration.effective.undownloadedWarningLeadDays} source={configuration.effective.undownloadedWarningLeadSource} />
        <EffectiveValue label="Conditional grace" value={configuration.effective.undownloadedGraceDays} source={configuration.effective.undownloadedGraceSource} />
      </div>
      <p className="text-sm text-muted-foreground">{configuration.override ? `Active override revision ${configuration.override.revision}. Blank override fields inherit the current global value.` : 'No active override. Every value currently comes from the global policy.'}</p>

      {configuration.overrideHistory.length ? (
        <div>
          <h3 className="font-medium">Override history</h3>
          <div className="mt-2 divide-y rounded-lg border px-4">
            {configuration.overrideHistory.map((version) => <div key={version.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">Revision {version.revision} · {version.isActive ? 'Current' : 'Inactive'}</p><p className="text-sm text-muted-foreground">{version.isActive ? version.changeReason : version.deactivationReason ?? version.changeReason}</p></div><p className="text-xs text-muted-foreground">{formatDateTime(version.createdAt)}</p></div>)}
          </div>
        </div>
      ) : null}

      <Dialog open={editOpen} onOpenChange={(open) => !upsert.isPending && setEditOpen(open)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{configuration.override ? 'Edit retention override' : 'Add retention override'}</DialogTitle><DialogDescription>Leave a value blank to inherit the current global setting. Existing package deadlines do not change.</DialogDescription></DialogHeader>
          <form id="organization-retention-override-form" noValidate className="space-y-4" onSubmit={overrideForm.handleSubmit((values) => upsert.mutate(values))}>
            <OptionalDayField form={overrideForm} name="standardRetentionDays" label="Standard retention (days)" inherited={configuration.global.values.standardRetentionDays} />
            <OptionalDayField form={overrideForm} name="undownloadedWarningLeadDays" label="Undownloaded warning lead (days)" inherited={configuration.global.values.undownloadedWarningLeadDays} />
            <OptionalDayField form={overrideForm} name="undownloadedGraceDays" label="Conditional grace (days)" inherited={configuration.global.values.undownloadedGraceDays} />
            <ReasonField id="organization-retention-reason" error={overrideForm.formState.errors.reason} registration={overrideForm.register('reason')} />
          </form>
          {upsert.error && !(upsert.error instanceof LocalValidationError) ? <Alert variant="destructive"><AlertTitle>Override was not saved</AlertTitle><AlertDescription>{fileManagementErrorMessage(upsert.error, 'Reload the account and try again.')}</AlertDescription></Alert> : null}
          <DialogFooter><Button type="button" variant="outline" disabled={upsert.isPending} onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" form="organization-retention-override-form" disabled={!overrideForm.formState.isDirty || upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={(open) => !remove.isPending && setRemoveOpen(open)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove {organizationName}'s retention override?</DialogTitle><DialogDescription>Future releases will inherit all global values. Existing package deadlines will not change.</DialogDescription></DialogHeader>
          <form id="remove-organization-retention-override-form" noValidate onSubmit={removalForm.handleSubmit((values) => remove.mutate(values))}>
            <ReasonField id="remove-organization-retention-reason" error={removalForm.formState.errors.reason} registration={removalForm.register('reason')} />
          </form>
          {remove.error ? <Alert variant="destructive"><AlertTitle>Override was not removed</AlertTitle><AlertDescription>{fileManagementErrorMessage(remove.error, 'Reload the account and try again.')}</AlertDescription></Alert> : null}
          <DialogFooter><Button type="button" variant="outline" disabled={remove.isPending} onClick={() => setRemoveOpen(false)}>Keep override</Button><Button type="submit" variant="destructive" form="remove-organization-retention-override-form" disabled={remove.isPending}>{remove.isPending ? 'Removing…' : 'Remove override'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const emptyOverride: OverrideFormValues = { standardRetentionDays: '', undownloadedWarningLeadDays: '', undownloadedGraceDays: '', reason: '' }

function EffectiveValue({ label, source, value }: { label: string; source: EffectiveReleasedDeliverablePolicy['standardRetentionSource']; value: number }) {
  return <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value} days</p><Badge variant="outline" className="mt-3">{source === 'organizationOverride' ? 'Organization override' : 'Global'}</Badge></div>
}

function OptionalDayField({ form, inherited, label, name }: { form: ReturnType<typeof useForm<OverrideFormValues>>; inherited: number; label: string; name: 'standardRetentionDays' | 'undownloadedWarningLeadDays' | 'undownloadedGraceDays' }) {
  const error = form.formState.errors[name]
  const id = `organization-policy-${name}`
  return <div><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min={1} step={1} inputMode="numeric" className="mt-2" aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} {...form.register(name)} /><p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">Leave blank to inherit {inherited} days.</p>{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{error.message}</p> : null}</div>
}

function ReasonField({ id, error, registration }: { id: string; error?: FieldError; registration: UseFormRegisterReturn }) {
  return <div><Label htmlFor={id}>Change reason <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label><textarea id={id} required className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...registration} />{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{String(error.message)}</p> : null}</div>
}

function readOptionalDays(value: string) { return value === '' ? null : Number(value) }
function optionalValue(value: number | null | undefined) { return value == null ? '' : String(value) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
class LocalValidationError extends Error {}
