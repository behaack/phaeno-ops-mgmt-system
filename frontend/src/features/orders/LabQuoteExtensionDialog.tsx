import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
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

export function LabQuoteExtensionDialog({ order, quote, onClose, onCloseFocus }: { order: LabServiceOrder; quote: Quote; onClose: () => void; onCloseFocus?: () => void }) {
  const __customerText = useCustomerText()

  const queryClient = useQueryClient()
  const formId = useId()
  const reasonId = useId()
  const [reviewedVersion, setReviewedVersion] = useState(order.version)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onBlur', reValidateMode: 'onChange', defaultValues: { reason: '' } })
  const { isDirty: __formDraftDirty } = form.formState

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
  useOrderDraftGuard(__formDraftDirty, mutation.isPending)
  async function close() {
    if (!mutation.isPending && (!__formDraftDirty || (await confirmPortal('Discard the unsaved extension request?')))) onClose()
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending} onCloseAutoFocus={event => { if (onCloseFocus) { event.preventDefault(); onCloseFocus() } }}>
      <DialogHeader>
        <DialogTitle><CustomerText message="m_b28bda20ef31" /></DialogTitle>
        <DialogDescription><CustomerText message="m_34ec0efbddd7" />{quote.revision} <CustomerText message="m_ccb2f8fb3cff" />{order.orderNumber}<CustomerText message="m_9170a3ae4826" /></DialogDescription>
      </DialogHeader>
      <DialogFeedback>
        {!eligible ? <Alert><AlertTitle>{requestPending ? <CustomerSourceText source={"Extension already requested"} /> : __customerText('m_183c0680c0bc')}</AlertTitle><AlertDescription>{requestPending ? <CustomerSourceText source={"Phaeno is reviewing this request. You do not need to send it again."} /> : __customerText('m_d2cbd90e2028')}</AlertDescription></Alert>
          : changed ? <Alert><AlertTitle><CustomerText message="m_272735810802" /></AlertTitle><AlertDescription><p><CustomerText message="m_b5fc085ab424" />{current?.revision} <CustomerText message="m_4514e104f24f" /></p><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { setReviewedVersion(order.version); mutation.reset() }}><CustomerText message="m_ae7928ce80e4" /></Button></AlertDescription></Alert>
            : mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_30eada853234" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Try again. Your reason has been kept.')} />}</AlertDescription></Alert> : null}
      </DialogFeedback>
      <form id={formId} noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending && eligible && !changed) mutation.mutate(values) })}>
        <Label htmlFor={reasonId}><CustomerText message="m_0f7d4664a9bc" /></Label>
        <FieldDescription id={`${reasonId}-hint`}><CustomerText message="m_e503fe81810c" /></FieldDescription>
        <Textarea id={reasonId} className="mt-2 min-h-24" disabled={mutation.isPending} aria-describedby={`${reasonId}-hint${form.formState.errors.reason ? ` ${reasonId}-error` : ''}`} aria-invalid={Boolean(form.formState.errors.reason)} {...form.register('reason', { onChange: () => { if (form.formState.errors.reason) void form.trigger('reason') } })} />
        <FieldError id={`${reasonId}-error`}>{form.formState.errors.reason?.message}</FieldError>
      </form>
      <RequiredDialogFooter showLegend={false}>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button>
        <Button type="submit" form={formId} disabled={mutation.isPending || !eligible || changed}>{mutation.isPending ? <CustomerSourceText source={"Sending request…"} /> : __customerText('m_171d13d4d582')}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
