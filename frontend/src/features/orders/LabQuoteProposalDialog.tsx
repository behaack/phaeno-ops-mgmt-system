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
  const queryClient = useQueryClient()
  const formId = useId()
  const reasonId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [reviewedVersion, setReviewedVersion] = useState(order.version)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
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
  const dismissal = useOrderDecisionDismissal(form.formState.isDirty, mutation.isPending, onClose)
  return <><Dialog open onOpenChange={open => { if (!open) dismissal.close() }}>
    <DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}
      onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus() }}
      onCloseAutoFocus={event => { event.preventDefault(); onCloseFocus() }}>
      <DialogHeader><DialogTitle>Propose changes</DialogTitle><DialogDescription>Quote revision {quote.revision} for {order.orderNumber}</DialogDescription></DialogHeader>
      <DialogFeedback>{!eligible ? <Alert><AlertTitle>This quote is no longer available for a proposal</AlertTitle><AlertDescription>Close this dialog and review the current quote. Your explanation has been kept.</AlertDescription></Alert>
        : changed ? <Alert><AlertTitle>The order changed</AlertTitle><AlertDescription><p>Your explanation has been kept. Review the current quote before continuing.</p><Button variant="outline" disabled={mutation.isPending} onClick={() => { setReviewedVersion(order.version); mutation.reset() }}>Use current quote</Button></AlertDescription></Alert>
          : mutation.error ? <Alert variant="destructive"><AlertTitle>Proposal was not sent</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Try again. Your explanation has been kept.')}</AlertDescription></Alert> : null}</DialogFeedback>
      <form id={formId} noValidate className="space-y-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && eligible && !changed) mutation.mutate(values) })}>
        <p className="text-sm">Your request will stay open for Phaeno to review. Sending a proposal pauses acceptance until Phaeno issues a revised quote.</p>
        <Field><Label htmlFor={reasonId}><RequiredFieldName>Proposed changes</RequiredFieldName></Label>
          <Textarea id={reasonId} required className="min-h-32" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={`${reasonId}-hint${form.formState.errors.reason ? ` ${reasonId}-error` : ''}`} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} />
          <FieldDescription id={`${reasonId}-hint`}>Describe the pricing, phase, service or timing changes you would like reviewed. Include phase names where applicable. Up to 2,000 characters.</FieldDescription>
          <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
        </Field>
      </form>
      <RequiredDialogFooter><Button ref={cancelRef} variant="outline" disabled={mutation.isPending} onClick={dismissal.close}>Keep reviewing</Button><Button type="submit" form={formId} disabled={mutation.isPending || !eligible || changed}>{mutation.isPending ? 'Sending proposal…' : 'Send proposal'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>{dismissal.confirmation}</>
}
