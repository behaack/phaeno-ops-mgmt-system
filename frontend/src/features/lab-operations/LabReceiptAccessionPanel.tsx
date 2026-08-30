import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ScanLine } from 'lucide-react'
import { useRef, useState } from 'react'

import { getOrderErrorMessage } from '#/api/order-management'
import { scanRegisteredSampleTube, scanSampleShippingPacket } from '#/api/sample-shipping'
import type { LabWorkOrderSummary } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { OrderStatusBadge } from '#/features/orders/OrderStatusBadge'
import { ReturnKitFulfillmentPanel } from '#/features/orders/ReturnKitFulfillmentPanel'

export function LabReceiptAccessionPanel({
  apiEnabled,
  workOrders,
}: {
  apiEnabled: boolean
  workOrders: LabWorkOrderSummary[]
}) {
  const packetBarcodeInput = useRef<HTMLInputElement>(null)
  const tubeBarcodeInput = useRef<HTMLInputElement>(null)
  const [packetBarcode, setPacketBarcode] = useState('')
  const [tubeBarcode, setTubeBarcode] = useState('')
  const packetScan = useMutation({
    mutationFn: scanSampleShippingPacket,
    onMutate: () => {
      setTubeBarcode('')
      tubeScan.reset()
    },
    onSettled: () => {
      setPacketBarcode('')
      window.requestAnimationFrame(() => packetBarcodeInput.current?.focus())
    },
  })
  const tubeScan = useMutation({
    mutationFn: (barcode: string) => scanRegisteredSampleTube(packetScan.data!.barcode, barcode),
    onSettled: () => {
      setTubeBarcode('')
      window.requestAnimationFrame(() => tubeBarcodeInput.current?.focus())
    },
  })
  const awaitingSpecimens = workOrders.filter((item) => item.status === 'AwaitingSpecimens')

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Receipt and accession</CardTitle>
          <CardDescription>
            Prepare return kits, identify arriving shipments, compare physical tubes, and open the authoritative Lab work order for receipt and accession.
          </CardDescription>
        </CardHeader>
      </Card>

      <ReturnKitFulfillmentPanel apiEnabled={apiEnabled} />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ScanLine className="mt-0.5 size-5 text-primary" />
            <div>
              <CardTitle>Scan shipment packet</CardTitle>
              <CardDescription>
                Scan the Phaeno barcode enclosed with the shipment. Lookup and tube comparison do not record custody, receipt, or accession.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              const value = packetBarcode.trim()
              if (value) packetScan.mutate(value)
            }}
          >
            <div className="w-full max-w-xl">
              <Label htmlFor="shipment-packet-barcode">Shipment-packet barcode</Label>
              <Input
                ref={packetBarcodeInput}
                id="shipment-packet-barcode"
                className="mt-2 font-mono uppercase"
                value={packetBarcode}
                onChange={(event) => setPacketBarcode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="PH-P-XXXXXXXXXX-X"
              />
            </div>
            <Button type="submit" disabled={!apiEnabled || !packetBarcode.trim() || packetScan.isPending}>
              <ScanLine data-icon="inline-start" />
              {packetScan.isPending ? 'Looking up…' : 'Look up packet'}
            </Button>
          </form>
          {packetScan.error ? (
            <Alert variant="destructive">
              <AlertTitle>Shipment packet was not found</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(packetScan.error, 'Check the complete barcode and scan again.')}</AlertDescription>
            </Alert>
          ) : null}
          {packetScan.data ? (
            <div className="rounded-lg border p-4" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{packetScan.data.packetNumber}</span>
                    <Badge variant="outline">Revision {packetScan.data.packetRevision}</Badge>
                    <Badge variant={packetScan.data.isVoided ? 'destructive' : 'secondary'}>
                      {packetScan.data.isVoided ? 'Voided packet' : packetScan.data.shipmentStatus}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    {packetScan.data.organizationName} · {formatAuthorizationSource(packetScan.data.authorizationSource)} {packetScan.data.authorizationReference}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {packetScan.data.expectedSampleCount} expected {packetScan.data.expectedSampleCount === 1 ? 'sample' : 'samples'} · ship to {packetScan.data.destinationName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatReceiptState(packetScan.data.receiptState, packetScan.data.receivedSampleCount, packetScan.data.expectedSampleCount)} · Lab work {formatCompactStatus(packetScan.data.labWorkStatus)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{packetScan.data.barcode}</p>
                </div>
                {!packetScan.data.isVoided ? (
                  <Button asChild>
                    <Link to="/lab-operations/$workOrderId" params={{ workOrderId: packetScan.data.labWorkOrderId }} search={{ section: undefined }}>
                      Open Lab work
                    </Link>
                  </Button>
                ) : null}
              </div>
              {packetScan.data.isVoided ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Do not use this packet revision</AlertTitle>
                  <AlertDescription>
                    {packetScan.data.voidReason ?? 'This packet was replaced or cancelled.'}
                    {packetScan.data.replacementBarcode ? ` Scan replacement ${packetScan.data.replacementBarcode}.` : ' Escalate the shipment for review.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="mt-5 border-t pt-5">
                  <h3 className="font-medium">Expected tube crosswalk</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Compare each physical tube with the frozen sample mapping before recording receipt or accession.</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b text-muted-foreground"><tr><th className="px-2 py-2 font-medium">Customer sample ID</th><th className="px-2 py-2 font-medium">Sample</th><th className="px-2 py-2 font-medium">Expected tube</th><th className="px-2 py-2 font-medium">State</th></tr></thead>
                      <tbody>{packetScan.data.crosswalk.map((item) => <tr key={item.tubeSlotId ?? item.shipmentItemId} className="border-b last:border-0"><td className="px-2 py-2 font-medium">{item.customerSampleId}<p className="mt-1 text-xs font-normal text-muted-foreground">Tube {item.tubeOrdinal ?? 1} of {item.tubeCount ?? 1}</p></td><td className="px-2 py-2">{item.sampleName}</td><td className="px-2 py-2 font-mono">{item.supplierTubeBarcode ?? 'Missing assignment'}</td><td className="px-2 py-2">{formatCompactStatus(item.tubeStatus)}</td></tr>)}</tbody>
                    </table>
                  </div>
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); const value = tubeBarcode.trim(); if (value) tubeScan.mutate(value) }}>
                    <div className="w-full max-w-xl"><Label htmlFor="registered-tube-barcode">Supplier tube barcode</Label><Input ref={tubeBarcodeInput} id="registered-tube-barcode" className="mt-2 font-mono uppercase" value={tubeBarcode} onChange={(event) => setTubeBarcode(event.target.value)} autoComplete="off" spellCheck={false} /></div>
                    <Button type="submit" disabled={!tubeBarcode.trim() || tubeScan.isPending}><ScanLine data-icon="inline-start" />{tubeScan.isPending ? 'Comparing…' : 'Compare tube'}</Button>
                  </form>
                  {tubeScan.error ? <Alert variant="destructive" className="mt-3"><AlertTitle>Tube could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(tubeScan.error, 'Check the complete barcode and scan again.')}</AlertDescription></Alert> : null}
                  {tubeScan.data ? <Alert variant={tubeScan.data.isExpected ? 'default' : 'destructive'} className="mt-3"><AlertTitle>{tubeScan.data.isExpected ? (tubeScan.data.isAccessioned ? 'Tube was already accessioned' : 'Tube matches this packet') : 'Stop: tube does not match this packet'}</AlertTitle><AlertDescription>{tubeScan.data.isExpected ? `${tubeScan.data.supplierTubeBarcode} maps to Customer sample ${tubeScan.data.customerSampleId}. This comparison did not record receipt or accession.` : tubeScanOutcome(tubeScan.data.outcome)}</AlertDescription></Alert> : null}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorized work awaiting specimens</CardTitle>
          <CardDescription>Open the Lab work order to record receipt condition, accession identity, container lineage, and disposition.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {awaitingSpecimens.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.id }} search={{ section: undefined }} className="font-medium text-primary hover:underline">
                    {item.commercialOrderNumber ?? item.id}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{item.specimenCount} expected specimen(s) · updated {formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2"><OrderStatusBadge status={item.status} /><Button asChild><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.id }} search={{ section: undefined }}>Open receipt</Link></Button></div>
              </div>
            ))}
          </div>
          {!awaitingSpecimens.length ? <p className="py-8 text-center text-sm text-muted-foreground">No authorized laboratory work is awaiting specimens.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatAuthorizationSource(value: 'ProspectTrialProject' | 'CustomerPromotionalOrder' | 'CustomerLabServiceOrder') { if (value === 'ProspectTrialProject') return 'Trial Project'; return value === 'CustomerLabServiceOrder' ? 'Customer Lab Service Job' : 'Customer promotional order' }
function tubeScanOutcome(value: string) { if (value === 'TubeNotRegistered') return 'The barcode is not registered in POMS. Hold the tube and reconcile the physical kit.'; if (value === 'TubeNotExpectedForPacket') return 'The tube is registered, but it is not on this packet crosswalk. Hold the package and investigate.'; if (value === 'PacketVoided') return 'The packet was voided. Scan the replacement packet before continuing.'; return 'The tube cannot be accepted for this packet.' }
function formatReceiptState(state: 'AwaitingReceipt' | 'PartiallyReceived' | 'ReceiptRecorded' | 'Cancelled' | 'SubmissionMismatch', received: number, expected: number) { if (state === 'AwaitingReceipt') return 'Awaiting receipt'; if (state === 'PartiallyReceived') return `${received} of ${expected} samples received`; if (state === 'ReceiptRecorded') return `Receipt recorded for ${received} ${received === 1 ? 'sample' : 'samples'}`; if (state === 'Cancelled') return 'Expected specimens cancelled'; return 'Manifest needs review' }
function formatCompactStatus(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
