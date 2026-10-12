import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage, isOrderConcurrencyError, proposeLabQuoteChanges, type LabServiceOrder, type Quote } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { currentLabQuote } from './use-quote-status'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

const schema = z.object({ reason: z.string().trim().min(1, 'Describe the changes you would like Phaeno to review.').max(2000, 'Use 2,000 characters or fewer.') })

export function LabQuoteProposalDialog({ order, quote, onClose, onCloseFocus }: {
  order: LabServiceOrder; quote: Quote; onClose: () => void; onCloseFocus: () => void
}) {
  const __customerText = useCustomerText()

  const queryClient = useQueryClient()
  const formId = useId()
  const reasonId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [reviewedVersion, setReviewedVersion] = useState(order.version)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const current = currentLabQuote(order.quotes)
  const eligible = current?.id === quote.id && order.canProposeQuoteChanges === true
  const changed = reviewedVersion !== order.version
  const mutation = useMutation({
    mutationFn: ({ reason }: z.infer<typeof schema>) => {
      const payload = JSON.stringify({ quoteId: quote.id, version: order.version, reason })
      if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() }
      return proposeLabQuoteChanges(order.id, quote.id, order.version, reason, attempt.current.key)
    },
    onSuccess: async updated => {
      queryClient.setQueryData(['lab-service-order', order.id], updated)
      form.reset(); onClose()
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['lab-service-order', order.id] }), queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] })])
    },
    onError: async error => { if (isOrderConcurrencyError(error)) await queryClient.invalidateQueries({ queryKey: ['lab-service-order', order.id] }) },
  })
  const dismissal = useOrderDecisionDismissal(__formDraftDirty, mutation.isPending, onClose)
  return <><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}>
    <DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}
      onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus() }}
      onCloseAutoFocus={event => { event.preventDefault(); onCloseFocus() }}>
      <DialogHeader><DialogTitle><CustomerText message="m_73eeb5083986" /></DialogTitle><DialogDescription><CustomerText message="m_dc6044766f60" />{quote.revision} <CustomerText message="m_ccb2f8fb3cff" />{order.orderNumber}</DialogDescription></DialogHeader>
      <DialogFeedback>{!eligible ? <Alert><AlertTitle><CustomerText message="m_cf5daefc0cf4" /></AlertTitle><AlertDescription><CustomerText message="m_a4ff48b82aa3" /></AlertDescription></Alert>
        : changed ? <Alert><AlertTitle><CustomerText message="m_45650ce905dd" /></AlertTitle><AlertDescription><p><CustomerText message="m_8f183e93bda5" /></p><Button variant="outline" disabled={mutation.isPending} onClick={() => { setReviewedVersion(order.version); mutation.reset() }}><CustomerText message="m_ae7928ce80e4" /></Button></AlertDescription></Alert>
          : mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_1ca9d8495620" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Try again. Your explanation has been kept.')} />}</AlertDescription></Alert> : null}</DialogFeedback>
      <form id={formId} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && eligible && !changed) mutation.mutate(values) })}>
        <p className="text-sm"><CustomerText message="m_67bb95548e9a" /></p>
        <Field><Label htmlFor={reasonId}><RequiredFieldName><CustomerText message="m_486f49f03bf7" /></RequiredFieldName></Label>
          <Textarea id={reasonId} required className="min-h-32" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={`${reasonId}-hint${form.formState.errors.reason ? ` ${reasonId}-error` : ''}`} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} />
          <FieldDescription id={`${reasonId}-hint`}><CustomerText message="m_88004a26933a" /></FieldDescription>
          <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
        </Field>
      </form>
      <RequiredDialogFooter><Button ref={cancelRef} variant="outline" disabled={mutation.isPending} onClick={dismissal.close}><CustomerText message="m_34411a1bde47" /></Button><Button type="submit" form={formId} disabled={mutation.isPending || !eligible || changed}>{mutation.isPending ? <CustomerSourceText source={"Sending proposal…"} /> : __customerText('m_5bfc78c4f892')}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>{dismissal.confirmation}</>
}
