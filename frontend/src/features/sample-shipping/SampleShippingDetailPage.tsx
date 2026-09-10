import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, Download, Printer, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  assignSampleTube,
  downloadSampleShippingCrosswalk,
  getSampleShipment,
  issueSampleShippingPacket,
  recordSampleShipment,
  type SampleShippingCrosswalkItem,
} from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { SampleTubeScanner } from './SampleTubeScanner'
import { SampleShipmentPackingPanel } from './SampleShipmentPackingPanel'
import { SampleShipmentResetPacking } from './SampleShipmentResetPacking'
import { ShippingContainerSelector } from './ShippingContainerSelector'
import { ShippingInsertPrintFrame } from './ShippingInsertPrintFrame'
import { TransportationKitsPanel } from './TransportationKitsPanel'
import { getShipmentKitSupply } from '#/api/transportation-kit-requests'

const assignmentSchema = z.object({ supplierBarcode: z.string().trim().min(4, 'Scan or enter the complete tube barcode.').max(100), reason: z.string().trim().max(1000) })
const shipmentSchema = z.object({ carrier: z.string().trim().min(1, 'Enter the carrier.').max(255), trackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), shippedAt: z.string().min(1, 'Enter the shipment time.') })
type AssignmentValues = z.infer<typeof assignmentSchema>
type ShipmentValues = z.infer<typeof shipmentSchema>
type ShipmentHeaderAction = {
  label: string
  icon?: LucideIcon
  disabled?: boolean
  variant?: 'default' | 'outline'
  kind: 'command'
  onSelect: () => void
}

export function SampleShippingDetailPage({ shipmentId, autoOpenKitOrder = false }: { shipmentId: string; autoOpenKitOrder?: boolean }) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const client = useQueryClient()
  const canView = Boolean(session?.capabilities.canViewSampleShipping)
  const canManage = Boolean(session?.capabilities.canManageSampleShipping)
  const query = useQuery({ queryKey: ['sample-shipment', shipmentId], queryFn: () => getSampleShipment(shipmentId), enabled: canView && authProvider !== 'mock' })
  const customerKitSupply = query.data?.authorizationSource === 'CustomerLabServiceOrder' && getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Customer'
  const [locationSelection, setLocationSelection] = useState<{ shipmentId: string; locationId: string } | null>(null)
  const selectedLocationId = locationSelection?.shipmentId === shipmentId ? locationSelection.locationId : query.data?.departureDeliveryLocationId ?? undefined
  const kitSupply = useQuery({ queryKey: ['transportation-kit-supply', query.data?.authorizationSourceId, shipmentId, selectedLocationId], queryFn: () => getShipmentKitSupply(shipmentId, selectedLocationId), enabled: customerKitSupply && canView && authProvider !== 'mock' })
  const [assignmentItem, setAssignmentItem] = useState<SampleShippingCrosswalkItem | null>(null)
  const [scanActive, setScanActive] = useState(false)
  const [packingOpen, setPackingOpen] = useState(false)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [packetAction, setPacketAction] = useState<'confirm' | null>(null)
  const [printRequest, setPrintRequest] = useState<string | null>(null)
  const [printFailure, setPrintFailure] = useState<{ shipmentId: string; message: string } | null>(null)
  const headerActionRef = useRef<HTMLButtonElement>(null)
  const printing = printRequest === shipmentId
  const startPrint = useCallback(() => { setPrintFailure(null); setPrintRequest(shipmentId) }, [shipmentId])
  const finishPrint = useCallback(() => { setPrintRequest(null); headerActionRef.current?.focus({ preventScroll: true }) }, [])
  const failPrint = useCallback((message: string) => { setPrintFailure({ shipmentId, message }); setPrintRequest(null); headerActionRef.current?.focus({ preventScroll: true }) }, [shipmentId])
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['sample-shipment', shipmentId] }), client.invalidateQueries({ queryKey: ['sample-shipments'] }), client.invalidateQueries({ queryKey: ['sample-shipping-packet', shipmentId] })]) }
  const assignment = useMutation({ mutationFn: ({ item, values }: { item: SampleShippingCrosswalkItem; values: AssignmentValues }) => assignSampleTube(shipmentId, item.shipmentItemId, { ...values, reason: values.reason || null, version: item.version, tubeSlotId: item.tubeSlotId ?? null }), onSuccess: async () => { setAssignmentItem(null); await refresh() } })
  const issue = useMutation({ mutationFn: (replacementReason: string | null) => issueSampleShippingPacket(shipmentId, { version: query.data!.version, replacementReason }), onSuccess: async () => { setPacketAction(null); await refresh() } })
  const shipped = useMutation({ mutationFn: (values: ShipmentValues) => recordSampleShipment(shipmentId, { carrier: values.carrier, trackingNumber: values.trackingNumber, shippedAt: new Date(values.shippedAt).toISOString(), version: query.data!.version }), onSuccess: async () => { setShipmentOpen(false); await refresh() } })
  const download = useMutation({ mutationFn: () => downloadSampleShippingCrosswalk(shipmentId), onSuccess: (blob) => { const href = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${query.data?.shipmentNumber ?? 'sample-shipment'}-tube-crosswalk.csv`; anchor.click(); URL.revokeObjectURL(href) } })

  if (!canView) return <Unavailable />
  if (query.isLoading) return <main className="page-wrap px-4 py-8"><p role="status" className="text-sm text-muted-foreground">Loading sample shipment…</p></main>
  if (!query.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Shipment unavailable</AlertTitle><AlertDescription>{query.error ? apiErrorMessage(query.error) : 'The requested shipment was not found.'}</AlertDescription></Alert></main>
  const shipment = query.data
  const matchedCount = shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length
  const retired = shipment.status === 'Cancelled'
  const inventoryBlocked = customerKitSupply && (kitSupply.isFetching || Boolean(kitSupply.error) || !kitSupply.data)
  const preparationAllowed = !retired && !query.error && (!customerKitSupply || !inventoryBlocked && Boolean(kitSupply.data?.canPrepareSamples))
  const departureLocationId = selectedLocationId ?? kitSupply.data?.deliveryLocationId ?? undefined
  const readyToConfirm = preparationAllowed && (!customerKitSupply || Boolean(shipment.assignedContainer)) && !shipment.isPackingPool && (Boolean(shipment.container) || shipment.returnKit?.status === 'Fulfilled') && matchedCount === shipment.crosswalk.length && shipment.crosswalk.length > 0 && shipment.status === 'Preparing'
  const error = download.error
  const headerActions: ShipmentHeaderAction[] = []
  if (shipment.currentPacket) {
    headerActions.push(
      { kind: 'command', label: 'Print shipping insert', icon: Printer, variant: 'outline', disabled: printing, onSelect: startPrint },
      { kind: 'command', label: 'Download tube list (CSV)', icon: Download, variant: 'outline', disabled: download.isPending, onSelect: () => download.mutate() },
    )
  }
  if (canManage && readyToConfirm) headerActions.push({ kind: 'command', label: 'Review and confirm shipping insert', onSelect: () => { issue.reset(); setPacketAction('confirm') } })
  if (canManage && shipment.status === 'ReadyToShip') headerActions.push({ kind: 'command', label: 'Record shipment', disabled: !preparationAllowed, onSelect: () => { shipped.reset(); setShipmentOpen(true) } })
  const preparation = shipment.isPackingPool ? <SampleShipmentPackingPanel shipment={shipment} canManage={canManage && !retired} locationInventory={customerKitSupply} deliveryLocationId={departureLocationId} writesBlocked={Boolean(inventoryBlocked || query.error || customerKitSupply && !departureLocationId)} onOpenChange={setPackingOpen} /> : <SampleTubeScanner key={shipment.id} shipment={shipment} canManage={canManage && !retired} requiresAssignedContainer={customerKitSupply} writesBlocked={!preparationAllowed} onScanActivityChange={setScanActive} onCorrect={item => { assignment.reset(); setAssignmentItem(item) }} onAssign={async (item, barcode) => {
    if (!preparationAllowed) throw new Error('Current container information must be verified before saving. Your scan is retained.')
    const saved = await assignSampleTube(shipment.id, item.shipmentItemId, { supplierBarcode: barcode, reason: null, version: item.version, tubeSlotId: item.tubeSlotId ?? null })
    client.setQueryData(['sample-shipment', shipment.id], saved)
    await refresh()
    return saved
  }} />

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {shipment.authorizationSource === 'CustomerPromotionalOrder' || shipment.authorizationSource === 'CustomerLabServiceOrder' ? (
            <Link
              to="/lab-services/$orderId"
              params={{ orderId: shipment.authorizationSourceId }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to lab job {shipment.authorizationReference}
            </Link>
          ) : (
            <Link to="/trial-projects/$trialId" params={{ trialId: shipment.authorizationSourceId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to Trial {shipment.authorizationReference}
            </Link>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="wrap-anywhere text-3xl font-semibold">{shipment.shipmentNumber}</h1>
            <Badge variant="outline">{humanize(shipment.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shipment.authorizationReference} · {shipment.destinationName}</p>
        </div>
        <ShipmentHeaderActions actions={headerActions} triggerRef={headerActionRef} dialogOpen={Boolean(packetAction) || shipmentOpen} />
      </section>
      <p role="status" className="sr-only">{printing ? 'Preparing shipping insert for printing…' : ''}</p>
      {printFailure?.shipmentId === shipmentId ? <Alert variant="destructive" className="mb-5"><AlertTitle>Shipping insert could not be printed</AlertTitle><AlertDescription>{printFailure.message}<Button variant="outline" onClick={startPrint}>Try again</Button></AlertDescription></Alert> : null}
      {printing ? <ShippingInsertPrintFrame key={shipmentId} shipmentId={shipmentId} onFinished={finishPrint} onFailure={failPrint} /> : null}
      {error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Tube list download failed</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
      {query.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Shipment refresh failed</AlertTitle><AlertDescription>Your current work is retained. <Button variant="outline" onClick={() => void query.refetch()}>Retry shipment</Button></AlertDescription></Alert> : null}
      {retired ? <Alert className="mb-5"><AlertTitle>Retired container configuration</AlertTitle><AlertDescription>This configuration is retained as history. Use a current shipping container or return to the Job to continue preparation.</AlertDescription></Alert> : null}
      <ShippingContainerSelector shipment={shipment} action={!retired && shipment.container && !shipment.isPackingPool ? <SampleShipmentResetPacking key={shipment.id} shipment={shipment} canManage={canManage} writesBlocked={Boolean(query.error)} scanActive={scanActive} /> : undefined} />
      {customerKitSupply && shipment.isPackingPool && !retired ? <div className="mb-5 max-w-xl space-y-1.5"><Label htmlFor="departure-location">Departure location</Label><select id="departure-location" className="h-9 w-full cursor-pointer rounded-md border bg-background px-3 text-sm" value={departureLocationId ?? ''} disabled={packingOpen || scanActive} onChange={event => setLocationSelection({ shipmentId, locationId: event.target.value })}><option value="">Select a departure location</option>{kitSupply.data?.locations.filter(location => location.isActive).map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select><p className="text-xs text-muted-foreground">Use received containers at the location where you are preparing these samples.</p>{departureLocationId ? <Link to="/delivery-locations/$locationId" params={{ locationId: departureLocationId }} search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId }} className="text-sm text-primary underline">View location inventory</Link> : null}</div> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        {customerKitSupply && !retired ? <TransportationKitsPanel key={shipment.id} shipment={shipment} canManage={canManage} deliveryLocationId={selectedLocationId} autoOpenOrder={autoOpenKitOrder}>{preparation}</TransportationKitsPanel> : preparation}
        <div className="space-y-5">
          {shipment.container ? <Card><CardHeader><CardTitle>Shipping container</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label="Container" value={shipment.container.commonName} />{shipment.assignedContainer ? <Info label="Container barcode" value={shipment.assignedContainer.kitNumber} /> : null}<Info label="SKU" value={shipment.container.sku} /><Info label="Contents and capacity" value={`${shipment.crosswalk.length} tubes · ${shipment.container.capacity} usable slots · ${Math.max(0, shipment.container.capacity - shipment.crosswalk.length)} spare`} /><p className="text-xs text-muted-foreground">Spare slots are empty capacity, not missing samples. Scan only the registered tubes supplied in this assigned container.</p></CardContent></Card> : null}
          {!customerKitSupply || !shipment.isPackingPool || shipment.returnKit ? <Card><CardHeader><CardTitle>Return kit</CardTitle><CardDescription>Phaeno registers these materials before sending them to you.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm">{shipment.returnKit ? <><Info label="Kit" value={shipment.returnKit.kitNumber} /><Info label="Tube" value={`${shipment.returnKit.tubeSupplierName} ${shipment.returnKit.tubeProductNumber}`} /><Info label="Shipper" value={`${shipment.returnKit.shipperSupplierName} ${shipment.returnKit.shipperProductNumber}`} /><Info label="Registered tubes" value={`${shipment.returnKit.tubes.length} of ${shipment.returnKit.requiredTubeCount}`} /><Info label="Outbound tracking" value={shipment.returnKit.outboundTrackingNumber ?? 'Not yet recorded'} /></> : <p className="text-muted-foreground">{shipment.container ? 'Confirm the physical container before scanning its permanent barcoded tubes.' : 'Phaeno has not prepared the return kit yet.'}</p>}</CardContent></Card> : null}
          {shipment.receivedTubeCount !== undefined ? <Card><CardHeader><CardTitle>Receipt progress</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{shipment.receivedTubeCount} of {shipment.expectedTubeCount ?? shipment.crosswalk.length} tubes received from this shipment.</p>{shipment.orderExpectedTubeCount !== undefined ? <p>{shipment.orderReceivedTubeCount ?? 0} of {shipment.orderExpectedTubeCount} tubes received across the Job.</p> : null}<p className="text-xs text-muted-foreground">A sample split across containers is only fully received when all of its expected tubes have been recorded.</p></CardContent></Card> : null}
          {!shipment.isPackingPool ? <Card><CardHeader><CardTitle>Before confirming</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Verify every Customer sample ID is non-PHI and matches your internal records.</li><li>Verify each physical tube barcode matches the row shown here.</li><li>Keep the shipping insert or download the tube list for your records.</li></ul><p className="mt-4 text-sm font-medium">{matchedCount} of {shipment.crosswalk.length} tubes matched</p></CardContent></Card> : null}
        </div>
      </div>

      <TubeAssignmentDialog item={assignmentItem} replacesPacket={Boolean(shipment.currentPacket)} isPending={assignment.isPending} error={assignment.error ? apiErrorMessage(assignment.error) : undefined} onOpenChange={(open) => { if (!open) setAssignmentItem(null) }} onSubmit={(values) => { if (assignmentItem) assignment.mutate({ item: assignmentItem, values }) }} />
      <ConfirmPacketDialog action={packetAction} shipmentNumber={shipment.shipmentNumber} sampleCount={new Set(shipment.crosswalk.map((item) => item.shipmentItemId)).size} tubeCount={shipment.crosswalk.length} isPending={issue.isPending} error={issue.error ? apiErrorMessage(issue.error) : undefined} onOpenChange={(open) => { if (!open) setPacketAction(null) }} onConfirm={() => issue.mutate(null)} onReturnFocus={() => headerActionRef.current?.focus()} />
      <RecordShipmentDialog open={shipmentOpen} isPending={shipped.isPending} error={shipped.error ? apiErrorMessage(shipped.error) : undefined} onOpenChange={setShipmentOpen} onSubmit={(values) => shipped.mutate(values)} onReturnFocus={() => headerActionRef.current?.focus()} />
    </main>
  )
}

function ShipmentHeaderActions({ actions, triggerRef, dialogOpen }: { actions: ShipmentHeaderAction[]; triggerRef: RefObject<HTMLButtonElement | null>; dialogOpen: boolean }) {
  if (!actions.length) return null
  const content = (action: ShipmentHeaderAction) => <>{action.icon ? <action.icon aria-hidden="true" data-icon="inline-start" /> : null}{action.label}</>
  if (actions.length === 1) {
    const action = actions[0]
    return <Button ref={triggerRef} type="button" variant={action.variant} disabled={action.disabled} onClick={action.onSelect} className="self-start">{content(action)}</Button>
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button ref={triggerRef} type="button" className="self-start">Actions<ChevronDown aria-hidden="true" data-icon="inline-end" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={event => { if (dialogOpen) event.preventDefault() }}>
      {actions.map(action => <DropdownMenuItem key={action.label} disabled={action.disabled} onSelect={action.onSelect}>{content(action)}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}

function TubeAssignmentDialog({ item, replacesPacket, isPending, error, onOpenChange, onSubmit }: { item: SampleShippingCrosswalkItem | null; replacesPacket: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: AssignmentValues) => void }) {
  const form = useForm<AssignmentValues>({ resolver: zodResolver(assignmentSchema), defaultValues: { supplierBarcode: '', reason: '' } })
  useEffect(() => { if (item) form.reset({ supplierBarcode: item.supplierTubeBarcode ?? '', reason: '' }) }, [form, item])
  const submit = form.handleSubmit((values) => {
    if (item?.supplierTubeBarcode && !values.reason.trim()) {
      form.setError('reason', { type: 'required', message: 'Enter a reason for changing the tube assignment.' })
      return
    }
    onSubmit(values)
  })
  return <Dialog open={Boolean(item)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{item?.supplierTubeBarcode ? 'Change tube assignment' : 'Match tube to sample'}</DialogTitle><DialogDescription>{item ? replacesPacket ? `Scan the replacement Phaeno-supplied tube for ${item.customerSampleId}. Saving voids the current shipping insert and issues a corrected version.` : `Scan the Phaeno-supplied tube for ${item.customerSampleId}.` : ''}</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="tube-assignment" className="grid gap-4" noValidate onSubmit={submit}><div className="grid gap-1.5"><Label htmlFor="supplier-barcode"><RequiredFieldName>Supplier tube barcode</RequiredFieldName></Label><Input id="supplier-barcode" autoComplete="off" className="font-mono uppercase" aria-invalid={Boolean(form.formState.errors.supplierBarcode)} {...form.register('supplierBarcode')} />{form.formState.errors.supplierBarcode ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.supplierBarcode.message}</p> : null}</div>{item?.supplierTubeBarcode ? <div className="grid gap-1.5"><Label htmlFor="assignment-reason"><RequiredFieldName>Correction reason</RequiredFieldName></Label><Input id="assignment-reason" aria-invalid={Boolean(form.formState.errors.reason)} {...form.register('reason')} />{form.formState.errors.reason ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}<p className="text-xs text-muted-foreground">The original assignment remains in history.</p></div> : null}</form><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="tube-assignment" disabled={isPending}>{isPending ? 'Saving…' : replacesPacket ? 'Save and update insert' : 'Save match'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}

function ConfirmPacketDialog({ action, shipmentNumber, sampleCount, tubeCount, isPending, error, onOpenChange, onConfirm, onReturnFocus }: { action: 'confirm' | null; shipmentNumber: string; sampleCount: number; tubeCount: number; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onConfirm: () => void; onReturnFocus: () => void }) {
  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}>
      <DialogHeader>
        <DialogTitle>Confirm shipping insert</DialogTitle>
        <DialogDescription>This confirms {sampleCount} {sampleCount === 1 ? 'sample' : 'samples'} across {tubeCount} {tubeCount === 1 ? 'tube' : 'tubes'} for {shipmentNumber}. Print the shipping insert and place it inside this container. A later correction will replace it with an updated version.</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Keep reviewing</Button>
        <Button disabled={isPending} onClick={onConfirm}>{isPending ? 'Confirming…' : 'Confirm and issue shipping insert'}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function RecordShipmentDialog({ open, isPending, error, onOpenChange, onSubmit, onReturnFocus }: { open: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: ShipmentValues) => void; onReturnFocus: () => void }) { const form = useForm<ShipmentValues>({ resolver: zodResolver(shipmentSchema), defaultValues: { carrier: '', trackingNumber: '', shippedAt: localDateTime() } }); useEffect(() => { if (open) form.reset({ carrier: '', trackingNumber: '', shippedAt: localDateTime() }) }, [form, open]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}><DialogHeader><DialogTitle>Record return shipment</DialogTitle><DialogDescription>Enter the carrier facts from your receipt. Phaeno does not purchase or track postage through this screen.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="record-shipment" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><Field id="shipment-carrier" label="Carrier" error={form.formState.errors.carrier?.message}><Input id="shipment-carrier" {...form.register('carrier')} /></Field><Field id="shipment-tracking" label="Tracking number" error={form.formState.errors.trackingNumber?.message}><Input id="shipment-tracking" {...form.register('trackingNumber')} /></Field><Field id="shipment-time" label="Shipped at" error={form.formState.errors.shippedAt?.message}><Input id="shipment-time" type="datetime-local" {...form.register('shippedAt')} /></Field></form><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="record-shipment" disabled={isPending}>{isPending ? 'Saving…' : 'Record shipment'}</Button></RequiredDialogFooter></DialogContent></Dialog> }

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
function Unavailable() { return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Sample shipping unavailable</AlertTitle><AlertDescription>Select an active Prospect or Customer organization.</AlertDescription></Alert></main> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
function localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
