import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { runLabManufacturingAction } from '#/api/lab-operations'
import { getOrderErrorMessage, type ReagentOrder } from '#/api/order-management'
import { confirmPortal } from '#/components/PortalConfirmation'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { RegisteredKitLotField } from '../RegisteredKitLotField'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const schema = z.object({ orderLineId: z.string().uuid('Choose an order line.'), quantity: z.number().positive('Enter a positive quantity.'),
  lotBatchNumber: z.string().trim().min(1, 'Choose a registered kit lot.').max(255), carrier: z.string().trim().min(1, 'Enter the carrier.').max(255),
  service: z.string().trim().max(255), trackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255),
  shippedAt: z.string().min(1, 'Record the shipment time.').refine(value => Number.isFinite(Date.parse(value)), 'Choose a valid shipment time.'),
})
export function PSeqKitShipmentDialog({ order, onSaved, onClose }: { order: ReagentOrder; onSaved: () => Promise<void>; onClose: () => void }) {
  const lines = order.lines.filter(line => line.remainingQuantity > 0)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: {
    orderLineId: lines[0]?.id ?? '', quantity: 1, lotBatchNumber: '', carrier: '', service: '', trackingNumber: '',
    shippedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  } })
  const selected = lines.find(line => line.id === form.watch('orderLineId'))
  const mutation = useMutation({ mutationFn: async (values: z.infer<typeof schema>) => {
    if (!selected || values.quantity > selected.remainingQuantity) throw new Error('The shipment exceeds the remaining quantity.')
    return runLabManufacturingAction<ReagentOrder>('reagent', `${order.id}/shipments`, { version: order.version, carrier: values.carrier,
      service: values.service || null, trackingNumber: values.trackingNumber, shippedAt: new Date(values.shippedAt).toISOString(),
      lines: [{ orderLineId: values.orderLineId, quantity: values.quantity, lotBatchNumber: values.lotBatchNumber }] }, true)
  }, onSuccess: async () => { form.reset(form.getValues()); allowNavigation(); await onSaved(); onClose() } })
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, mutation.isPending)
  async function close() { if (!mutation.isPending && (!form.formState.isDirty || await confirmPortal('Discard the unsaved kit shipment?'))) { allowNavigation(); onClose() } }
  function field(name: 'quantity' | 'carrier' | 'service' | 'trackingNumber' | 'shippedAt', label: string, type = 'text', required = true) {
    const error = form.formState.errors[name]?.message
    return <Field><Label htmlFor={`kit-shipment-${name}`}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><Input id={`kit-shipment-${name}`} type={type} aria-invalid={Boolean(error)} aria-describedby={`kit-shipment-${name}-error`} {...form.register(name, name === 'quantity' ? { valueAsNumber: true } : {})} /><FieldError id={`kit-shipment-${name}-error`}>{error}</FieldError></Field>
  }
  return <Dialog open onOpenChange={open => { if (!open) void close() }}><DialogContent showCloseButton={!mutation.isPending} aria-busy={mutation.isPending}><DialogHeader><DialogTitle>Record PSeq kit shipment</DialogTitle><DialogDescription>The registered lot supplies the labeled expiration. Each shipment records its own quantities and accounting source.</DialogDescription></DialogHeader>
    <form id="pseq-kit-shipment" noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-2">
      <Field><Label htmlFor="kit-shipment-line"><RequiredFieldName>Order line</RequiredFieldName></Label><NativeSelect id="kit-shipment-line" value={form.watch('orderLineId')} onChange={event => { form.setValue('orderLineId', event.target.value, { shouldDirty: true }); form.setValue('lotBatchNumber', '', { shouldDirty: true }) }}>{lines.map(line => <option key={line.id} value={line.id}>{line.description} · {line.remainingQuantity} remaining</option>)}</NativeSelect></Field>
      {field('quantity', 'Quantity', 'number')}<RegisteredKitLotField productId={selected?.qboCatalogItemId} value={form.watch('lotBatchNumber')} onChange={value => form.setValue('lotBatchNumber', value, { shouldDirty: true, shouldValidate: true })} error={form.formState.errors.lotBatchNumber?.message} />
      {field('carrier', 'Carrier')}{field('service', 'Service (optional)', 'text', false)}{field('trackingNumber', 'Tracking number')}{field('shippedAt', 'Actual shipment time', 'datetime-local')}
    </fieldset></form>{mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'The shipment was not saved. Your entries are retained.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => void close()}>Cancel</Button><Button type="submit" form="pseq-kit-shipment" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record shipment'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
