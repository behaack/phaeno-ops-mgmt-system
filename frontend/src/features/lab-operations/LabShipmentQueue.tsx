import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getLabShipmentQueue } from '#/api/lab-shipment-receipt'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function LabShipmentQueue({ apiEnabled, received = false, onOpen }: {
  apiEnabled: boolean
  received?: boolean
  onOpen?: (barcode: string) => void
}) {
  const query = useQuery({ queryKey: ['lab-shipment-queue', received], queryFn: () => getLabShipmentQueue(received), enabled: apiEnabled })
  return <Card><CardHeader><CardTitle>{received ? 'Received containers awaiting accession' : 'Expected shipments'}</CardTitle>
    <CardDescription>{received ? 'Open a received container, then scan and accession its individual tubes.' : 'One row per expected container, including its carrier and tracking number. Scan its shipping insert above when it physically arrives.'}</CardDescription></CardHeader>
    <CardContent>
      {!apiEnabled ? <p className="text-sm text-muted-foreground">A connected laboratory session is required.</p> : query.isLoading ? <p role="status">Loading shipments…</p> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Shipments could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh the queue and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry shipments</Button></AlertDescription></Alert> : null}
      {query.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b"><tr>
        <th className="px-2 py-3">Shipment / container</th><th className="px-2 py-3">Customer / Job</th><th className="px-2 py-3">Carrier / tracking</th><th className="px-2 py-3">Tubes</th><th className="px-2 py-3">{received ? 'Received' : 'Status'}</th>
      </tr></thead><tbody>{query.data.map(item => <tr key={item.id} className="border-b last:border-0">
        <td className="px-2 py-3">{received && item.packetBarcode && onOpen ? <Button variant="link" className="h-auto p-0" onClick={() => onOpen(item.packetBarcode!)}>{item.shipmentNumber}</Button> : <Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.labWorkOrderId }} search={{ section: 'receipt', receiptTab: received ? 'accession' : 'receiving', shipmentId: item.id }} className="font-medium text-primary underline">{item.shipmentNumber}</Link>}<p className="text-xs text-muted-foreground">{item.destinationName}</p></td>
        <td className="px-2 py-3">{item.organizationName}<p className="text-xs text-muted-foreground">{item.authorizationReference}</p></td>
        <td className="px-2 py-3">{item.carrier || 'Carrier not recorded'}<p className="font-mono text-xs">{item.trackingNumber || 'Tracking not recorded'}</p></td>
        <td className="px-2 py-3">{received ? `${item.accessionedTubeCount} of ${item.expectedTubeCount} accessioned` : `${item.expectedTubeCount} expected`}</td>
        <td className="px-2 py-3">{received && item.containerReceivedAt ? new Date(item.containerReceivedAt).toLocaleString() : item.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</td>
      </tr>)}</tbody></table></div> : apiEnabled && query.isSuccess ? <p className="py-5 text-sm text-muted-foreground">{received ? 'No received containers are awaiting accession.' : 'No containers are currently expected.'}</p> : null}
    </CardContent></Card>
}
