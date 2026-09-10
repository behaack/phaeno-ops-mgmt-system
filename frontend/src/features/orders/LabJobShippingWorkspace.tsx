import { createPortal } from 'react-dom'
import { useRef, type RefObject } from 'react'
import type { LabServiceOrder } from '#/api/order-management'
import type { ShipmentKitSupply } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { SampleShippingDetailPage, type ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import type { SampleTubeListContext } from '#/features/sample-shipping/SampleTubeScanner'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'
import { LabJobWorkspaceActions } from './LabJobWorkspaceActions'
import type { ChangeLabJobWorkspace, LabJobWorkspaceSearch } from './lab-job-workspace-search'
import { humanizeStatus } from './OrderStatusBadge'

export function LabJobShippingWorkspace({ order, workspace, onWorkspaceChange, headerTarget, sendActionTarget, orderActions, orderDialogOpen, onActivityChange, navigationLocked = false, onNavigationLockChange, onKitSupplyChange }: {
  order: LabServiceOrder
  workspace: LabJobWorkspaceSearch
  onWorkspaceChange: ChangeLabJobWorkspace
  headerTarget: HTMLElement | null
  sendActionTarget?: HTMLElement | null
  orderActions: ShipmentHeaderAction[]
  orderDialogOpen: boolean
  onActivityChange: (active: boolean) => void
  navigationLocked?: boolean
  onNavigationLockChange?: (active: boolean) => void
  onKitSupplyChange?: (supply: ShipmentKitSupply | undefined) => void
}) {
  const { allowed, shipments, related, retired, receiptState } = useSourceSampleShipments(order.id)
  const fallbackActionRef = useRef<HTMLButtonElement>(null)
  const fallbackSendRef = useRef<HTMLButtonElement>(null)
  const jobShipments = allowed ? related.filter(item => item.organizationId === order.organizationId && ['CustomerLabServiceOrder', 'CustomerPromotionalOrder'].includes(item.authorizationSource)) : []
  const selected = workspace.shipmentId
    ? [...jobShipments, ...retired.filter(item => allowed && item.organizationId === order.organizationId && ['CustomerLabServiceOrder', 'CustomerPromotionalOrder'].includes(item.authorizationSource))].find(item => item.id === workspace.shipmentId)
    : jobShipments.length === 1 ? jobShipments[0] : undefined
  const unknownSelection = Boolean(workspace.shipmentId && !selected && receiptState === 'ready')
  const tubesView = workspace.shippingView === 'tubes'
  const specimenSources = Object.fromEntries(order.samples.map(sample => [sample.id, sample.biologicalSource]))
  const matchedSlots = new Set(jobShipments.flatMap(item => item.crosswalk.filter(row => row.supplierTubeBarcode).map(row => row.tubeSlotId ?? `${item.id}:${row.shipmentItemId}:${row.tubeOrdinal ?? 1}`)))
  const expected = jobShipments.find(item => item.orderExpectedTubeCount !== undefined)?.orderExpectedTubeCount
  const jobTubeProgress = receiptState === 'ready' && expected !== undefined && matchedSlots.size <= expected ? { matched: matchedSlots.size, total: expected } : undefined
  const change = (patch: Partial<LabJobWorkspaceSearch>) => { if (!navigationLocked && !orderDialogOpen) void onWorkspaceChange(patch) }
  const hasSentInsert = jobShipments.some(item => item.shippedAt && item.currentPacket && !item.currentPacket.isVoided)
  const fallbackShippingActions: ShipmentHeaderAction[] = jobShipments.length > 1 ? [{ kind: 'command', label: hasSentInsert ? 'Select container to reprint insert' : 'Select a shipping container', onSelect: () => document.getElementById('job-shipment-selector')?.focus() }] : []
  const needsShipmentSelection = !selected || !['Preparing', 'ReadyToShip'].includes(selected.status)
  const renderSendAction = (action: ShipmentHeaderAction | null, triggerRef: RefObject<HTMLButtonElement | null>) => {
    if (!sendActionTarget) return null
    const fallback: ShipmentHeaderAction = {
      kind: 'command',
      label: needsShipmentSelection ? 'Choose shipment' : 'Review shipping insert',
      onSelect: () => {
        if (navigationLocked || orderDialogOpen) return
        if (needsShipmentSelection) document.getElementById('job-shipment-selector')?.focus()
        else {
          void onWorkspaceChange({ shipmentId: selected.id, shippingView: 'tubes', orderKits: undefined }).then(() => {
            document.getElementById('samples-and-shipping')?.focus()
          })
        }
      },
    }
    const command = action ?? fallback
    return createPortal(<div className="flex max-w-full flex-col items-start gap-1.5">
      <Button ref={triggerRef} type="button" size="sm" disabled={command.disabled || navigationLocked || orderDialogOpen || !allowed || receiptState !== 'ready' || shipments.isFetching} aria-busy={command.busy || undefined} aria-describedby={command.descriptionId} onClick={command.onSelect}>
        {command.icon ? <command.icon aria-hidden="true" /> : null}{command.label}
      </Button>
      {jobShipments.length > 1 && selected && action ? <p className="max-w-64 text-xs text-muted-foreground wrap-anywhere">{selected.shipmentNumber}</p> : null}
    </div>, sendActionTarget)
  }
  const renderSamples = (context?: SampleTubeListContext) => <LabJobSamplesPanel key={order.id} order={order} embedded
    tubeShipments={allowed ? selected?.status === 'Cancelled' ? [...jobShipments, selected] : jobShipments : undefined} tubeContext={context} navigationLocked={navigationLocked || orderDialogOpen}
    page={(workspace.samplePage ?? 1) - 1} onPageChange={page => change({ samplePage: page ? page + 1 : undefined })} />
  return <Card id="samples-and-shipping" tabIndex={-1} className="min-w-0 scroll-mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <CardHeader>
      <CardTitle>Samples and shipping</CardTitle>
      <CardDescription>{order.sampleRosterFinalizedAt ? 'Review your samples, prepare each container and record its shipment here.' : 'Enter the accepted samples and finalize the list before preparing your shipment.'}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {!selected && headerTarget ? createPortal(<LabJobWorkspaceActions orderActions={orderActions} shipmentActions={fallbackShippingActions} triggerRef={fallbackActionRef} dialogOpen={orderDialogOpen} />, headerTarget) : null}
      {!selected ? renderSendAction(null, fallbackSendRef) : null}
      {allowed && (jobShipments.length > 1 || (!selected || selected.status === 'Cancelled') && jobShipments.length > 0) ? <div className="space-y-1.5">
        <Label htmlFor="job-shipment-selector">Shipping container</Label>
        <select id="job-shipment-selector" aria-describedby={!selected && hasSentInsert ? 'job-shipment-reprint-hint' : undefined} className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm" value={selected?.id ?? ''} disabled={navigationLocked || orderDialogOpen || Boolean(shipments.error) || shipments.isFetching} onChange={event => change({ shipmentId: event.target.value || undefined, orderKits: undefined })}>
          <option value="">Select a container</option>
          {jobShipments.map(item => <option key={item.id} value={item.id}>{item.isPackingPool ? 'Tubes awaiting containers' : item.shipmentNumber} · {item.crosswalk.length} tubes · {humanizeStatus(item.status)} · {item.destinationName}</option>)}
          {selected?.status === 'Cancelled' ? <option value={selected.id}>{selected.shipmentNumber} · Retired</option> : null}
        </select>
        {!selected && hasSentInsert ? <p id="job-shipment-reprint-hint" className="text-sm text-muted-foreground">Select a shipping container to reprint its shipping insert.</p> : null}
      </div> : null}
      {selected ? <p className="text-sm wrap-anywhere"><span className="font-medium">{selected.isPackingPool ? 'Tubes awaiting containers' : `Selected shipment: ${selected.shipmentNumber}`}</span> · {humanizeStatus(selected.status)} · {selected.destinationName}</p> : null}
      {unknownSelection ? <Alert><AlertTitle>Selected shipment is not available for this Job</AlertTitle><AlertDescription>Choose a current container to continue. <Button variant="outline" onClick={() => change({ shipmentId: undefined, orderKits: undefined })}>Choose current container</Button></AlertDescription></Alert> : null}
      {shipments.error ? <Alert variant="destructive"><AlertTitle>Shipping information could not be loaded</AlertTitle><AlertDescription>Your sample list is preserved. <Button variant="outline" onClick={() => void shipments.refetch()}>Retry shipments</Button></AlertDescription></Alert> : null}
      {!selected ? renderSamples() : null}
      {selected ? <SampleShippingDetailPage key={selected.id} shipmentId={selected.id} autoOpenKitOrder={workspace.orderKits} embedded={{
        sourceId: order.id,
        specimenSources,
        jobTubeProgress,
        onActivityChange,
        onNavigationLockChange,
        onKitSupplyChange,
        showPreparation: tubesView,
        renderSamples,
        onClosePreparation: () => change({ shippingView: undefined, orderKits: undefined }),
        onSelectShipment: id => onWorkspaceChange({ shipmentId: id, shippingView: 'tubes', orderKits: undefined }, { afterSave: true }),
        onOpenPreparation: () => change({ shipmentId: selected.id, shippingView: 'tubes' }),
        renderActions: (actions, triggerRef, dialogOpen) => headerTarget ? createPortal(<LabJobWorkspaceActions orderActions={orderActions} shipmentActions={actions} shipmentLabel={selected.shipmentNumber} triggerRef={triggerRef} dialogOpen={dialogOpen || orderDialogOpen} />, headerTarget) : null,
        renderSendAction,
      }} /> : !shipments.error && allowed && shipments.isLoading ? <p role="status">Loading shipping containers…</p>
          : !shipments.error && tubesView ? <p className="text-sm text-muted-foreground">{jobShipments.length > 1 ? 'Select the container you are preparing before scanning.' : 'Container preparation becomes available after the accepted sample list is finalized.'}</p> : null}
    </CardContent>
  </Card>
}
