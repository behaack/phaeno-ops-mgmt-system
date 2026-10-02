import { Link } from '@tanstack/react-router'
import type { LabShipmentQueueItem } from '#/api/lab-shipment-receipt'
import { Button } from '#/components/ui/button'
import type { ShipmentHistorySearch } from './lab-shipment-history-search'

export function LabShipmentTable({ items, received = false, onOpen, returnSearch }: {
  items: LabShipmentQueueItem[]
  received?: boolean
  onOpen?: (barcode: string) => void
  returnSearch?: ShipmentHistorySearch
}) {
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b bg-muted text-foreground"><tr>
    <th className="px-2 py-3">Shipment / container</th><th className="px-2 py-3">Customer / Job</th><th className="px-2 py-3">Carrier / tracking</th><th className="px-2 py-3">Tubes</th><th className="px-2 py-3">{received ? 'Received' : 'Status'}</th>
  </tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b bg-muted/20 last:border-0">
    <td className="px-2 py-3">{received && item.packetBarcode && onOpen ? <Button variant="link" className="h-auto p-0" onClick={() => onOpen(item.packetBarcode!)}>{item.shipmentNumber}</Button> : <Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.labWorkOrderId }} search={{ section: 'receipt', receiptTab: returnSearch ? 'receiving' : received ? 'accession' : 'receiving', shipmentId: item.id, ...returnSearch }} className="font-medium text-primary underline">{item.shipmentNumber}</Link>}
      {item.packetBarcode ? <p className="font-mono text-xs text-muted-foreground wrap-anywhere"><span className="sr-only">Shipping insert: </span>{item.packetBarcode}</p> : null}
      <p className="text-xs text-muted-foreground">{item.destinationName}</p></td>
    <td className="px-2 py-3">{item.organizationName}<p className="text-xs text-muted-foreground">{item.authorizationReference}</p></td>
    <td className="px-2 py-3">{item.carrier || 'Carrier not recorded'}<p className="font-mono text-xs">{item.trackingNumber || 'Tracking not recorded'}</p></td>
    <td className="px-2 py-3">{received ? `${item.accessionedTubeCount} of ${item.expectedTubeCount} accessioned` : `${item.expectedTubeCount} expected`}</td>
    <td className="px-2 py-3">{received && item.containerReceivedAt ? new Date(item.containerReceivedAt).toLocaleString() : item.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</td>
  </tr>)}</tbody></table></div>
}
