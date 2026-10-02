import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLabWorkOrder, type LabWorkOrderDetail } from '#/api/lab-operations'
import { scanSampleShippingPacket, type SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { StoreAcceptedTubesDialog } from './StoreAcceptedTubesDialog'

export function ContainerAccessionDialog({ initialPacket, canAccession, onClose }: {
  initialPacket: SampleShippingPacketScan; canAccession: boolean; onClose: () => void
}) {
  const client = useQueryClient()
  const packetQuery = useQuery({ queryKey: ['accession-packet', initialPacket.barcode], queryFn: () => scanSampleShippingPacket(initialPacket.barcode), initialData: initialPacket })
  const workQuery = useQuery({ queryKey: ['lab-work-order', initialPacket.labWorkOrderId], queryFn: () => getLabWorkOrder(initialPacket.labWorkOrderId) })
  const packet = packetQuery.data
  const refreshFailed = workQuery.isError || packetQuery.isError
  const refresh = () => { void workQuery.refetch(); void packetQuery.refetch() }
  const saved = async (detail: LabWorkOrderDetail) => {
    client.setQueryData(['lab-work-order', packet.labWorkOrderId], detail)
    await client.invalidateQueries({ queryKey: ['lab-work-order', 'accessioned-samples'] })
    await Promise.all(['lab-shipment-queue', 'accession-packet', 'lab-receipt-context', 'lab-operations', 'lab-attempts', 'lab-execution', 'sample-shipment', 'sample-shipments', 'platform-sample-shipments'].map(key => client.invalidateQueries({ queryKey: [key] })))
  }
  if (workQuery.data) return <StoreAcceptedTubesDialog rows={packet.crosswalk} packet={packet} work={workQuery.data}
    available={canAccession && !refreshFailed && !['Cancelled', 'ReadyForRelease'].includes(workQuery.data.workOrder.status)}
    refreshFailed={refreshFailed} onRefresh={refresh} onClose={onClose} onSaved={saved} />

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="sm:max-w-4xl">
    <DialogHeader><DialogTitle>Accession tubes in {packet.shipmentNumber}</DialogTitle><DialogDescription>Loading the expected tubes and their recorded intake decisions.</DialogDescription></DialogHeader>
    <div>{refreshFailed ? <Alert variant="destructive"><AlertTitle>Could not refresh shipment details</AlertTitle><AlertDescription><Button variant="outline" onClick={refresh}>Try again</Button></AlertDescription></Alert> : <p role="status">Loading shipment details…</p>}</div>
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </DialogContent></Dialog>
}
