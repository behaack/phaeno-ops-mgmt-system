import { useQuery } from '@tanstack/react-query'
import { getShippingContainerDefinitions, type ShippingStockKit } from '#/api/shipping-containers'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { PrepareStandardKitDialog } from '../stock-kits/StandardKitDialogs'

export function PrepareRequestedKitsDialog({ neededSizeIds, onClose, onSaved }: {
  neededSizeIds: string[]
  onClose: () => void
  onSaved: (kit: ShippingStockKit) => Promise<void>
}) {
  const definitions = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions })
  if (definitions.data && !definitions.error) return <PrepareStandardKitDialog
    definitions={definitions.data.filter(item => neededSizeIds.includes(item.id))}
    onClose={onClose} onSaved={onSaved}
  />
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent>
    <DialogHeader><DialogTitle>Prepare kits</DialogTitle><DialogDescription>Load the container sizes still needed for this request.</DialogDescription></DialogHeader>
    {definitions.error ? <Alert variant="destructive"><AlertTitle>Kit sizes could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(definitions.error, 'Try again.')} <Button variant="outline" onClick={() => void definitions.refetch()}>Retry</Button></AlertDescription></Alert> : <p role="status">Loading kit sizes…</p>}
  </DialogContent></Dialog>
}
