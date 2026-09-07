import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { CrmAssociationRecordCombobox } from './CrmAssociationRecordCombobox'

const schema = z.object({
  targetId: z.string().min(1, 'Select the record to keep from the search results.'),
  reason: z.string().trim().min(1, 'Explain why these records are confirmed duplicates.').max(1000, 'Use 1,000 characters or fewer.'),
})
type Values = z.infer<typeof schema>
export type CrmMergeSource = { id: string; name: string; version: number }

export function CrmMergeDialog({ recordLabel, source, pending, error, onClose, onSubmit }: {
  recordLabel: 'Company' | 'Contact'
  source: CrmMergeSource
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (targetId: string, reason: string) => void
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), mode: 'onSubmit', reValidateMode: 'onChange', defaultValues: { targetId: '', reason: '' } })
  useOrderDraftGuard(form.formState.isDirty, pending)
  function close() {
    if (!pending && (!form.formState.isDirty || window.confirm('Discard unsaved merge choices?'))) onClose()
  }
  const targetError = form.formState.errors.targetId?.message

  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader>
        <DialogTitle>Merge duplicate {recordLabel}</DialogTitle>
        <DialogDescription>Retire {source.name} and move its associations and history to the selected record. This preserves the duplicate as an inactive alias and writes a permanent merge audit. It cannot be undone in the CRM interface.</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form id="crm-merge-form" noValidate onSubmit={form.handleSubmit(values => { if (!pending) onSubmit(values.targetId, values.reason) }, errors => { if (errors.targetId) document.getElementById('merge-target')?.focus() })}>
        <fieldset disabled={pending} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="merge-target"><RequiredFieldName>Target record</RequiredFieldName></Label>
            <CrmAssociationRecordCombobox id="merge-target" name="targetId" kind={recordLabel === 'Company' ? 'company' : 'contact'} required excludedIds={[source.id]} invalid={Boolean(targetError)} describedBy={targetError ? 'merge-target-help merge-target-error' : 'merge-target-help'} onValueChange={id => form.setValue('targetId', id, { shouldDirty: true, shouldValidate: Boolean(targetError) })} />
            <p id="merge-target-help" className="text-xs text-muted-foreground">Search the active {recordLabel} directory and select the record that should remain authoritative.</p>
            <FieldError id="merge-target-error">{targetError}</FieldError>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merge-reason"><RequiredFieldName>Merge reason</RequiredFieldName></Label>
            <Textarea id="merge-reason" required maxLength={1000} rows={4} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'merge-reason-error' : undefined} {...form.register('reason')} />
            <FieldError id="merge-reason-error">{form.formState.errors.reason?.message}</FieldError>
          </div>
        </fieldset>
      </form>
      <RequiredDialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button>
        <Button type="submit" form="crm-merge-form" variant="destructive" disabled={pending}>{pending ? 'Merging…' : 'Merge records'}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}