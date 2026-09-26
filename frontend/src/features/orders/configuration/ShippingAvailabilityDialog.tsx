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
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => setShippingDestinationStatus(change.item.id, { isActive: change.isActive, version: change.item.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const action = change.isActive ? 'Activate' : 'Deactivate'
  const future = new Date(change.item.effectiveFrom).getTime() > Date.now()
  const isDefault = configuration.defaultDestinationDefinitionKey === change.item.definitionKey
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
    <DialogHeader><DialogTitle>{action} destination?</DialogTitle><DialogDescription>{change.item.name} · revision {change.item.revision}. {change.isActive
      ? `Makes this revision available for new Orders${future ? ` from ${new Date(change.item.effectiveFrom).toLocaleString()}` : ' now'}, replacing an earlier Active revision at that time.`
      : 'Stops selecting this revision for new Orders. Orders already assigned to it retain their destination and issued instructions.'} The revision number stays unchanged.</DialogDescription></DialogHeader>
    {!change.isActive && isDefault ? <Alert variant="destructive"><AlertTitle>Default destination</AlertTitle><AlertDescription>Set another Active destination as Default before deactivating this one. Ordering requires one available Default.</AlertDescription></Alert> : null}
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Refresh the destinations and try again.')}</AlertDescription></Alert> : null}
    <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="button" variant={change.isActive ? 'default' : 'destructive'} disabled={mutation.isPending || (!change.isActive && isDefault)} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : action}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}