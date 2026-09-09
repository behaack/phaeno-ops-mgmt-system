import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage, isOrderConcurrencyError, requestLabQuoteExtension, type LabServiceOrder, type Quote } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from './use-order-draft-guard'
import { currentLabQuote } from './use-quote-status'

const schema = z.object({ reason: z.string().trim().max(2000, 'Use 2,000 characters or fewer.') })

export function LabQuoteExtensionDialog({ order, quote, onClose }: { order: LabServiceOrder; quote: Quote; onClose: () => void }) {
  const queryClient = useQueryClient()
  const formId = useId()
  const reasonId = useId()
  const [reviewedVersion, setReviewedVersion] = useState(order.version)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
  const current = currentLabQuote(order.quotes)
  const requestPending = current?.id === quote.id && current.extensionRequest?.status === 'Pending'
  const eligible = current?.id === quote.id && order.canRequestQuoteExtension === true && !requestPending
  const changed = reviewedVersion !== order.version
  const mutation = useMutation({
    mutationFn: async ({ reason }: z.infer<typeof schema>) => {
      const payload = JSON.stringify({ quoteId: quote.id, version: order.version, reason })
      if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() }
      return requestLabQuoteExtension(order.id, quote.id, order.version, reason, attempt.current.key)
    },
    onSuccess: async updated => {
      queryClient.setQueryData(['lab-service-order', order.id], updated)
      form.reset()
      onClose()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
        queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }),
      ])
    },
    onError: async error => {
      if (isOrderConcurrencyError(error)) await queryClient.invalidateQueries({ queryKey: ['lab-service-order', order.id] })
    },
  })
  useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  function close() {
    if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard the unsaved extension request?'))) onClose()
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}>
      <DialogHeader>
        <DialogTitle>Request quote extension</DialogTitle>
        <DialogDescription>Ask Phaeno to review revision {quote.revision} for {order.orderNumber}. If approved, Phaeno will issue a new quote revision with a new expiration date. This request does not accept the quote.</DialogDescription>
      </DialogHeader>
      <DialogFeedback>
        {!eligible ? <Alert><AlertTitle>{requestPending ? 'Extension already requested' : 'This quote is no longer available for an extension request'}</AlertTitle><AlertDescription>{requestPending ? 'Phaeno is reviewing this request. You do not need to send it again.' : 'Close this dialog and review the current quote.'}</AlertDescription></Alert>
          : changed ? <Alert><AlertTitle>The Job changed</AlertTitle><AlertDescription><p>Your reason is retained. Revision {current?.revision} is still available for an extension request. Review the current Job before continuing.</p><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { setReviewedVersion(order.version); mutation.reset() }}>Use current quote</Button></AlertDescription></Alert>
            : mutation.error ? <Alert variant="destructive"><AlertTitle>Extension request was not sent</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Try again. Your reason has been kept.')}</AlertDescription></Alert> : null}
      </DialogFeedback>
      <form id={formId} noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending && eligible && !changed) mutation.mutate(values) })}>
        <Label htmlFor={reasonId}>Reason (optional)</Label>
        <FieldDescription id={`${reasonId}-hint`}>Include any timing details that would help Phaeno review your request.</FieldDescription>
        <Textarea id={reasonId} className="mt-2 min-h-24" disabled={mutation.isPending} aria-describedby={`${reasonId}-hint${form.formState.errors.reason ? ` ${reasonId}-error` : ''}`} aria-invalid={Boolean(form.formState.errors.reason)} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} />
        <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
      </form>
      <RequiredDialogFooter showLegend={false}>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button>
        <Button type="submit" form={formId} disabled={mutation.isPending || !eligible || changed}>{mutation.isPending ? 'Sending request…' : 'Request extension'}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
