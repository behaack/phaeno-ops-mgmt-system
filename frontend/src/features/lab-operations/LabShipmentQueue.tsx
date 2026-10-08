import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { getLabShipmentQueue } from '#/api/lab-shipment-receipt'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { LabShipmentTable } from './LabShipmentTable'

export function LabShipmentQueue({ apiEnabled, received = false, onOpen, headerContent }: {
  apiEnabled: boolean
  received?: boolean
  onOpen?: (barcode: string) => void
  headerContent?: ReactNode
}) {
  const query = useQuery({ queryKey: ['lab-shipment-queue', received], queryFn: () => getLabShipmentQueue(received), enabled: apiEnabled })
  return <Card className="min-w-0 gap-0 overflow-hidden py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>{received ? 'Received containers awaiting accession' : 'Expected shipments'}</CardTitle>
    <CardDescription>{received ? 'Select a received container or enter its shipping insert barcode, then accession its individual tubes.' : 'One row per expected container, including its carrier and tracking number. When it physically arrives, scan its shipping insert in Receive a shipment.'}</CardDescription>
    {headerContent ? <div className="col-span-full space-y-4">{headerContent}</div> : null}</CardHeader>
    <CardContent className="p-4">
      {!apiEnabled ? <p className="text-sm text-muted-foreground">A connected laboratory session is required.</p> : query.isLoading ? <p role="status">Loading shipments…</p> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Shipments could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh the queue and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry shipments</Button></AlertDescription></Alert> : null}
      {query.data?.length ? <LabShipmentTable items={query.data} received={received} onOpen={onOpen} /> : apiEnabled && query.isSuccess ? <p className="py-5 text-sm text-muted-foreground">{received ? 'No received containers are awaiting accession.' : 'No containers are currently expected.'}</p> : null}
    </CardContent></Card>
}
