import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrderErrorMessage } from '#/api/order-management'
import { setShippingDestinationStatus, type SampleShippingConfiguration, type SampleShippingDestination } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'

export type ShippingStatusChange = { kind: 'destination'; item: SampleShippingDestination; isActive: boolean }

export function ShippingAvailabilityDialog({ change, configuration, onClose, restoreFocus }: {
  change: ShippingStatusChange
  configuration: SampleShippingConfiguration
  onClose: () => void
  restoreFocus: () => void
}) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => setShippingDestinationStatus(change.item.id, { isActive: change.isActive, version: change.item.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const action = change.isActive ? 'Activate' : 'Deactivate'
  const future = new Date(change.item.effectiveFrom).getTime() > Date.now()
  const isDefault = configuration.defaultDestinationDefinitionKey === change.item.definitionKey
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
    <DialogHeader><DialogTitle>{action} <CustomerText message="m_8796c7f27a00" /></DialogTitle><DialogDescription>{change.item.name} <CustomerText message="m_3b0e4579f573" />{change.item.revision}. {change.isActive
      ? __customerText('m_c4b96c1a0699', { p0: String(future ? ` from ${new Date(change.item.effectiveFrom).toLocaleString()}` : ' now') })
      : __customerText('m_dd416e560bc4')} <CustomerText message="m_1f9d0516b754" /></DialogDescription></DialogHeader>
    {!change.isActive && isDefault ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_9c59dc1da91e" /></AlertTitle><AlertDescription><CustomerText message="m_98fd1c21894f" /></AlertDescription></Alert> : null}
    {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_762139977717" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Refresh the destinations and try again.')} />}</AlertDescription></Alert> : null}
    <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant={change.isActive ? "default" : "destructive"} disabled={mutation.isPending || (!change.isActive && isDefault)} onClick={() => mutation.mutate()}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : action}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}