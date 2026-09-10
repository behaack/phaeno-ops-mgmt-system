import { useMutation } from '@tanstack/react-query'
import { ScanLine } from 'lucide-react'
import { useRef, useState } from 'react'

import { getOrderErrorMessage } from '#/api/order-management'
import { scanSampleShippingPacket } from '#/api/sample-shipping'
import { scanShippingIdentity } from '#/api/shipping-containers'
import type { LabWorkOrderSummary } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { labReceiptTabs, resolveLabReceiptTab, type LabReceiptTab } from './lab-receipt-tabs'
import { Label } from '#/components/ui/label'
import { LabShipmentReceiptPanel } from './LabShipmentReceiptPanel'
import { LabShipmentQueue } from './LabShipmentQueue'
import { ContainerAccessionDialog } from './ContainerAccessionDialog'
import { ReturnKitFulfillmentPanel } from '#/features/orders/ReturnKitFulfillmentPanel'
import { StandardKitInventoryPanel } from '#/features/orders/stock-kits/StandardKitInventoryPanel'
import { KitRequestsPanel } from '#/features/orders/kit-requests/KitRequestsPanel'

export function LabReceiptAccessionPanel({
  apiEnabled,
  shipmentId,
  tab,
  onTabChange,
  canManageKitSupply = false,
  canReceiveShipments = false,
}: {
  apiEnabled: boolean
  tab?: LabReceiptTab
  onTabChange?: (tab: LabReceiptTab) => void
  canManageKitSupply?: boolean
  canReceiveShipments?: boolean
  shipmentId?: string
  workOrders: LabWorkOrderSummary[]
}) {
  const [localTab, setLocalTab] = useState<LabReceiptTab>()
  const selectedTab = resolveLabReceiptTab(onTabChange ? tab : localTab ?? tab, shipmentId, canManageKitSupply)
  const visibleTabs = labReceiptTabs.filter(item => !item.requiresKitManagement || canManageKitSupply)
  const packetBarcodeInput = useRef<HTMLInputElement>(null)
  const [packetBarcode, setPacketBarcode] = useState('')
  const [containerOpen, setContainerOpen] = useState(false)
  const identityScan = useMutation({
    mutationFn: scanShippingIdentity,
    onMutate: () => { packetScan.reset() },
    onSettled: () => { setPacketBarcode(''); window.requestAnimationFrame(() => packetBarcodeInput.current?.focus()) },
  })
  const packetScan = useMutation({
    mutationFn: scanSampleShippingPacket,
    onMutate: () => {
      identityScan.reset()
      setContainerOpen(false)
    },
    onSuccess: () => setContainerOpen(true),
    onError: () => window.requestAnimationFrame(() => packetBarcodeInput.current?.focus()),
    onSettled: () => {
      setPacketBarcode('')
    },
  })
  const changeTab = (next: LabReceiptTab) => { if (onTabChange) onTabChange(next); else setLocalTab(next) }
  const openAccession = (barcode: string) => { changeTab('accession'); packetScan.mutate(barcode) }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Receipt and accession</h2>
        <p className="text-sm text-muted-foreground">Manage outbound kits and receive incoming samples. Choose a tab to focus on one task.</p>
      </div>
      <Tabs value={selectedTab} onValueChange={value => changeTab(value as LabReceiptTab)} className="gap-4">
        <div className="min-w-0 overflow-x-auto pb-1">
          <TabsList aria-label="Shipping and receiving tasks" className="w-max min-w-full">
            {visibleTabs.map(item => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {canManageKitSupply ? <TabsContent value="kit-requests"><KitRequestsPanel apiEnabled={apiEnabled} /></TabsContent> : null}
        {canManageKitSupply ? <TabsContent value="standard-kits"><StandardKitInventoryPanel apiEnabled={apiEnabled} shipmentId={shipmentId} /></TabsContent> : null}
        <TabsContent value="return-kits"><ReturnKitFulfillmentPanel apiEnabled={apiEnabled} shipmentId={shipmentId} showEmpty /></TabsContent>
        <TabsContent value="receiving"><LabShipmentReceiptPanel apiEnabled={apiEnabled} canReceive={canReceiveShipments} onAccession={openAccession} /></TabsContent>
        <TabsContent value="accession" className="space-y-5">
      <LabShipmentQueue apiEnabled={apiEnabled} received onOpen={barcode => packetScan.mutate(barcode)} />
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ScanLine className="mt-0.5 size-5 text-primary" />
            <div>
              <CardTitle>Open a received container</CardTitle>
              <CardDescription>
                Select a received container above or scan its PH-P- shipping insert barcode. Then scan and accession each individual tube.
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
              if (value && !packetScan.isPending && !identityScan.isPending) {
                if (/^\*?PH-[OM]-/i.test(value)) identityScan.mutate(value)
                else packetScan.mutate(value)
              }
            }}
          >
            <div className="w-full max-w-xl">
              <Label htmlFor="shipment-packet-barcode">Shipping insert barcode</Label>
              <p id="shipment-barcode-help" className="mt-1 text-sm text-muted-foreground">Scan or enter the complete PH-P- code printed below “Scan to receive this shipment” on the insert.</p>
              <Input
                ref={packetBarcodeInput}
                id="shipment-packet-barcode"
                aria-describedby="shipment-barcode-help"
                className="mt-2 font-mono uppercase"
                value={packetBarcode}
                onChange={(event) => setPacketBarcode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="PH-P-…"
              />
            </div>
            <Button type="submit" disabled={!apiEnabled || !packetBarcode.trim() || packetScan.isPending || identityScan.isPending}>
              <ScanLine data-icon="inline-start" />
              {packetScan.isPending || identityScan.isPending ? 'Looking up…' : 'Look up barcode'}
            </Button>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Which other identifiers can I use?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li><strong>Shipment barcode (PH-S-):</strong> opens the shipment’s current confirmed insert. The SHP… shipment reference names the same shipment, but cannot be entered in this field.</li>
              <li><strong>Order barcode (PH-O-) or sample barcode (PH-M-):</strong> finds related shipments; choose Open manifest to continue.</li>
              <li><strong>Physical container barcode (KIT-):</strong> identifies the kit and is not accepted here. Scan individual tube barcodes in the tube field after opening the insert.</li>
            </ul>
          </details>
          <p className="text-sm text-muted-foreground">Opening an insert here does not record arrival. Receive the container in Receive shipments first; each tube is accessioned separately.</p>
          {identityScan.error ? <Alert variant="destructive"><AlertTitle>Shipping identity was not found</AlertTitle><AlertDescription>{getOrderErrorMessage(identityScan.error, 'Check the complete barcode and scan again.')}</AlertDescription></Alert> : null}
          {identityScan.data ? <section aria-live="polite" className="rounded-lg border p-4"><h3 className="wrap-anywhere font-medium">{identityScan.data.kind === 'Order' ? 'Customer Job' : 'Sample'} {identityScan.data.reference}</h3><p className="mt-1 text-xs text-muted-foreground">Choose the shipment manifest to compare its registered tubes. This lookup did not record receipt.</p><div className="mt-3 divide-y">{identityScan.data.shipments.map(shipment => <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="wrap-anywhere text-sm font-medium">{shipment.shipmentNumber}</p><p className="wrap-anywhere text-xs text-muted-foreground">{shipment.organizationName} · {shipment.destinationName} · {formatCompactStatus(shipment.status)}</p></div>{shipment.currentPacket ? <Button size="sm" variant="outline" disabled={packetScan.isPending} onClick={() => packetScan.mutate(shipment.currentPacket!.barcode)}>Open manifest {shipment.currentPacket.packetNumber}</Button> : <span className="text-xs text-muted-foreground">No confirmed manifest</span>}</div>)}</div>{!identityScan.data.shipments.length ? <p className="mt-3 text-sm text-muted-foreground">No shipments are available for this identity.</p> : null}</section> : null}
          {packetScan.error ? (
            <Alert variant="destructive">
              <AlertTitle>Shipment packet was not found</AlertTitle>
              <AlertDescription>{getOrderErrorMessage(packetScan.error, 'Check the complete barcode and scan again.')}</AlertDescription>
            </Alert>
          ) : null}
          {packetScan.data && containerOpen ? <ContainerAccessionDialog key={packetScan.data.barcode} initialPacket={packetScan.data} canAccession={canReceiveShipments} onClose={() => { setContainerOpen(false); window.requestAnimationFrame(() => packetBarcodeInput.current?.focus()) }} /> : null}
        </CardContent>
      </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}

function formatCompactStatus(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
