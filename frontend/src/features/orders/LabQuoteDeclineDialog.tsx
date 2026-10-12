import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
  const __customerText = useCustomerText()

  const formId = useId()
  const reasonId = useId()
  const explanationId = useId()
  const submitting = useRef(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '', explanation: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const selectedReason = useWatch({ control: form.control, name: 'reason' })
  const isBusy = busy || form.formState.isSubmitting
  const dismissal = useOrderDecisionDismissal(__formDraftDirty, isBusy, onClose)
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
        <DialogTitle><CustomerText message="m_582575edea0a" />{orderNumber}</DialogTitle>
        <DialogDescription>{quoteRevision ? __customerText('m_b86057d722ab', { p0: String(quoteRevision) }) : __customerText('m_9a577057772a')}</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_c6c335bc69d3" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Try again. Your selected reason has been kept.')} />}</AlertDescription></Alert> : null}
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <p className="text-sm"><CustomerText message="m_ac51a4a42d67" /></p>
        {unavailableReason ? <Alert><AlertTitle><CustomerText message="m_4915dcce5690" /></AlertTitle><AlertDescription>{unavailableReason}</AlertDescription></Alert> : null}
        <Field>
          <Label htmlFor={reasonId}><RequiredFieldName><CustomerText message="m_f81ab834de5f" /></RequiredFieldName></Label>
          <NativeSelect id={reasonId} required disabled={isBusy} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? `${reasonId}-error` : undefined} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason'); if (form.formState.errors.explanation) form.clearErrors('explanation') } })}>
            <option value=""><CustomerText message="m_8f60b8652e7c" /></option>
            {reasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
          </NativeSelect>
          <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
        </Field>
        {selectedReason === 'Other' ? <Field>
          <Label htmlFor={explanationId}><RequiredFieldName><CustomerText message="m_4702058c8a87" /></RequiredFieldName></Label>
          <Textarea id={explanationId} required disabled={isBusy} className="min-h-24" aria-invalid={Boolean(form.formState.errors.explanation)} aria-describedby={form.formState.errors.explanation ? `${explanationId}-error` : undefined} {...form.register('explanation', { onChange: () => { if (form.formState.errors.explanation) void form.trigger('explanation') } })} />
          <FieldError id={`${explanationId}-error`}>{form.formState.errors.explanation?.message}</FieldError>
        </Field> : null}
      </form>
      <RequiredDialogFooter>
        <Button ref={cancelRef} type="button" variant="outline" disabled={isBusy} onClick={dismissal.close}><CustomerText message="m_34411a1bde47" /></Button>
        <Button type="submit" form={formId} variant="destructive" disabled={isBusy || Boolean(unavailableReason)}>{isBusy ? <CustomerSourceText source={"Updating…"} /> : __customerText('m_e95880061726')}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>{dismissal.confirmation}</>
}
