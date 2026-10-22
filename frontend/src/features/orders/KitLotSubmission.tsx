import { DisplayTimestamp } from '#/components/ui/display-value'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { KitAssemblyCase } from '#/api/order-bundles'
import { getOrderErrorMessage } from '#/api/order-management'
import { submitPartnerKitLot, type KitLotAssessment, type KitLotSubmission } from '#/api/pseq-kit-lots'
import { confirmPortal } from '#/components/PortalConfirmation'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDraftGuard } from './use-order-draft-guard'

export function KitLotAssessmentView({ assessment, usedOn }: { assessment: KitLotAssessment; usedOn?: string | null }) {
  return <div className="space-y-3 text-sm" aria-live="polite">
    <p><span className="font-medium">Lot {assessment.lotNumber}</span> · {usedOn ? `Kit used on ${usedOn}` : `Pre-use check on ${assessment.assessedOn}`}</p>
    <p className="text-muted-foreground">{assessment.expirationDate ? `Labeled expiration: ${assessment.expirationDate}` : 'Expiration date not recorded.'}</p>
    {assessment.isRecalled ? <Alert variant="destructive"><AlertTitle>Lot recalled</AlertTitle><AlertDescription>{assessment.recallReason} Contact Phaeno before using this product.</AlertDescription></Alert> : null}
    {assessment.isExpired ? <Alert variant="destructive"><AlertTitle>{usedOn ? 'Kit was expired when used' : 'Kit lot has expired'}</AlertTitle><AlertDescription>{usedOn ? 'The recorded kit-use date is after the labeled expiration. Phaeno will see this warning during intake.' : 'Check with Phaeno before preparing or sequencing libraries with this product.'}</AlertDescription></Alert> : null}
    {assessment.expirationUnknown ? <Alert><AlertTitle>Expiration unknown</AlertTitle><AlertDescription>Phaeno has no verified expiration date for this lot. Contact Phaeno before using the kit.</AlertDescription></Alert> : null}
    {!assessment.isRecalled && !assessment.isExpired && !assessment.expirationUnknown ? <p>No recall or expiration warning for this check.</p> : null}
  </div>
}

export function KitLotSubmissionSummary({ submission }: { submission?: KitLotSubmission | null }) {
  if (!submission) return <p className="text-sm text-muted-foreground">Submit the lot from the kit label before preparing or sequencing libraries. You can do this now, without assembly files. A lot and actual kit-use date are required before requesting assembly.</p>
  return <div className="space-y-2"><KitLotAssessmentView assessment={submission.currentAssessment} usedOn={submission.usedOn} />
    <p className="text-xs text-muted-foreground">Lot submission saved {<DisplayTimestamp value={submission.checkedAt} seconds />}. Current lot status is shown above.</p>
    {!submission.usedOn ? <p className="text-sm text-muted-foreground">Add the actual kit-use date when known, before submitting assembly inputs.</p> : null}</div>
}

const schema = z.object({
  lotNumber: z.string().trim().min(1, 'Enter the lot number printed on the kit.').max(255),
  usedOn: z.union([z.literal(''), z.iso.date('Enter a valid kit-use date.')]).refine(value => !value || value <= new Date().toISOString().slice(0, 10), 'Enter an actual use date on or before today.'),
})
export function PartnerKitLotDialog({ orderId, kitCase, onClose, restoreFocus }: { orderId: string; kitCase: KitAssemblyCase; onClose: () => void; restoreFocus?: () => void }) {
  const cache = useQueryClient()
  const key = useRef<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: {
    lotNumber: kitCase.lotSubmission?.enteredLotNumber ?? '', usedOn: kitCase.lotSubmission?.usedOn ?? '',
  } })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => submitPartnerKitLot(orderId, kitCase.id, {
      caseVersion: kitCase.version, version: kitCase.lotSubmission?.version ?? null,
      lotNumber: values.lotNumber, usedOn: values.usedOn || null,
    }, key.current ??= crypto.randomUUID()),
    onSuccess: async () => { form.reset(form.getValues()); await refresh(); onClose() },
    onError: () => refresh(),
  })
  async function refresh() {
    await Promise.all(['reagent-order', 'platform-order', 'lab-reagent-order', 'assembly-request', 'data-assembly-request'].map(name => cache.invalidateQueries({ queryKey: [name] })))
  }
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  async function close() {
    if (mutation.isPending) return
    if (!form.formState.isDirty || await confirmPortal('Discard the unsaved kit lot entry?')) { allowNavigation(); onClose() }
  }
  return <Dialog open onOpenChange={open => { if (!open) void close() }}><DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending} onCloseAutoFocus={event => { if (restoreFocus) { event.preventDefault(); restoreFocus() } }}>
    <DialogHeader><DialogTitle>{kitCase.lotSubmission ? 'Update kit lot submission' : 'Submit kit lot'} · {kitCase.caseNumber}</DialogTitle>
      <DialogDescription>Check your kit lot before library preparation or sequencing. Assembly files and a kit-use date are not needed for an early check.</DialogDescription></DialogHeader>
    <form id="partner-kit-lot-form" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
      <fieldset disabled={mutation.isPending} className="grid gap-4">
        <Field><Label htmlFor="partner-kit-lot"><RequiredFieldName>Lot number</RequiredFieldName></Label><Input id="partner-kit-lot" autoComplete="off" aria-invalid={Boolean(form.formState.errors.lotNumber)} aria-describedby="partner-kit-lot-error" {...form.register('lotNumber')} /><FieldError id="partner-kit-lot-error">{form.formState.errors.lotNumber?.message}</FieldError></Field>
        <Field><Label htmlFor="partner-kit-used-on">Actual kit-use date (optional for early checks)</Label><Input id="partner-kit-used-on" type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(form.formState.errors.usedOn)} aria-describedby="partner-kit-used-on-help partner-kit-used-on-error" {...form.register('usedOn')} /><FieldDescription id="partner-kit-used-on-help">Leave blank if the kit has not been used. Add the actual date before submitting data for assembly.</FieldDescription><FieldError id="partner-kit-used-on-error">{form.formState.errors.usedOn?.message}</FieldError></Field>
      </fieldset>
    </form>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Lot was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the lot and try again. Your entries are retained.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void close()}>Cancel</Button><Button type="submit" form="partner-kit-lot-form" disabled={mutation.isPending}>{mutation.isPending ? 'Checking…' : 'Save and check lot'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
