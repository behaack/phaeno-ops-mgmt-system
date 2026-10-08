import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { NativeSelect } from '#/components/ui/native-select'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

const reasons = ['Our needs changed', 'Cost is too high', 'Selected another vendor', 'Prefer not to say', 'Other'] as const
const schema = z.object({
  reason: z.string().refine(value => reasons.some(reason => reason === value), 'Select a reason.'),
  explanation: z.string(),
}).superRefine((values, context) => {
  if (values.reason !== 'Other') return
  const explanation = values.explanation.trim()
  if (!explanation) context.addIssue({ code: 'custom', path: ['explanation'], message: 'Please explain why you are declining this quote.' })
  // The existing reason field allows 2,000 characters including "Other: ".
  else if (explanation.length > 1993) context.addIssue({ code: 'custom', path: ['explanation'], message: 'Use 1,993 characters or fewer.' })
})

export function LabQuoteDeclineDialog({ orderNumber, quoteRevision, busy, error, unavailableReason, onDecline, onClose, onCloseFocus }: {
  orderNumber: string
  quoteRevision?: number
  busy: boolean
  error: unknown
  onDecline: (reason: string) => Promise<unknown>
  onClose: () => void
  onCloseFocus?: () => void
  unavailableReason?: string
}) {
  const formId = useId()
  const reasonId = useId()
  const explanationId = useId()
  const submitting = useRef(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '', explanation: '' } })
  const selectedReason = useWatch({ control: form.control, name: 'reason' })
  const isBusy = busy || form.formState.isSubmitting
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, isBusy, onClose)
  const submit = form.handleSubmit(async values => {
    if (busy || submitting.current || unavailableReason) return
    submitting.current = true
    try {
      await onDecline(values.reason === 'Other' ? `Other: ${values.explanation.trim()}` : values.reason)
    } catch {
      // The owning mutation supplies persistent error feedback and keeps this draft open.
    } finally {
      submitting.current = false
    }
  })
  return <><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}>
    <DialogContent showCloseButton={!isBusy} aria-busy={isBusy}
      onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus() }}
      onCloseAutoFocus={event => { if (onCloseFocus) { event.preventDefault(); onCloseFocus() } }}>
      <DialogHeader>
        <DialogTitle>Decline quote for {orderNumber}</DialogTitle>
        <DialogDescription>{quoteRevision ? `Quote revision ${quoteRevision}` : 'Current quote'}</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertTitle>Quote was not declined</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again. Your selected reason has been kept.')}</AlertDescription></Alert> : null}
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <p className="text-sm">Declining this quote closes the entire request, including every phase. The quote, phase details and history will be kept.</p>
        {unavailableReason ? <Alert><AlertTitle>Quote decision is unavailable</AlertTitle><AlertDescription>{unavailableReason}</AlertDescription></Alert> : null}
        <Field>
          <Label htmlFor={reasonId}><RequiredFieldName>Reason</RequiredFieldName></Label>
          <NativeSelect id={reasonId} required disabled={isBusy} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? `${reasonId}-error` : undefined} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason'); if (form.formState.errors.explanation) form.clearErrors('explanation') } })}>
            <option value="">Select a reason</option>
            {reasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
          </NativeSelect>
          <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
        </Field>
        {selectedReason === 'Other' ? <Field>
          <Label htmlFor={explanationId}><RequiredFieldName>Please explain</RequiredFieldName></Label>
          <Textarea id={explanationId} required disabled={isBusy} className="min-h-24" aria-invalid={Boolean(form.formState.errors.explanation)} aria-describedby={form.formState.errors.explanation ? `${explanationId}-error` : undefined} {...form.register('explanation', { onChange: () => { if (form.formState.errors.explanation) void form.trigger('explanation') } })} />
          <FieldError id={`${explanationId}-error`}>{form.formState.errors.explanation?.message}</FieldError>
        </Field> : null}
      </form>
      <RequiredDialogFooter>
        <Button ref={cancelRef} type="button" variant="outline" disabled={isBusy} onClick={dismissal.close}>Keep reviewing</Button>
        <Button type="submit" form={formId} variant="destructive" disabled={isBusy || Boolean(unavailableReason)}>{isBusy ? 'Updating…' : 'Decline quote and close request'}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>{dismissal.confirmation}</>
}
