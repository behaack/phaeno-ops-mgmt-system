import { LoadingState } from '#/components/ui/content-state'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { getShippingContainerDefinitions, type ShippingStockKit } from '#/api/shipping-containers'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { AssembleTransportationKitDialog } from '../stock-kits/AssembleTransportationKitDialog'

export function PrepareRequestedKitsDialog({ neededSizeIds, onClose, onSaved }: {
  neededSizeIds: string[]
  onClose: () => void
  onSaved: (kit: ShippingStockKit) => Promise<void>
}) {
  const definitions = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions })
  if (definitions.data && !definitions.error) return <AssembleTransportationKitDialog
    definitions={definitions.data.filter(item => neededSizeIds.includes(item.id))}
    onClose={onClose} onSaved={onSaved}
  />
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle><CustomerSourceText source={"Prepare kits"} /></DialogTitle><DialogDescription><CustomerSourceText source={"Load the kit specifications still needed for this request."} /></DialogDescription></DialogHeader>
    {definitions.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Kit sizes could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(definitions.error, 'Try again.')} />} <Button variant="outline" onClick={() => void definitions.refetch()}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : <LoadingState  label={<><CustomerSourceText source={"Loading kit sizes…"} /></>} />}
  </DialogContent></Dialog>
}
