import { createPortal } from 'react-dom'
import { useRef, useState, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LabSampleTubeWorkspace, LabServiceOrder } from '#/api/order-management'
import type { ShipmentKitSupply } from '#/api/transportation-kit-requests'
import { getLabPhaseKitSupply } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { SampleShippingDetailPage, type ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import type { SampleTubeListContext } from '#/features/sample-shipping/SampleTubeScanner'
import { groupSampleRows } from './sample-source-capacity'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'
import { LabJobPairedPreparation } from './LabJobPairedPreparation'
import { LabJobWorkspaceActions } from './LabJobWorkspaceActions'
import type { ChangeLabJobWorkspace, LabJobWorkspaceSearch } from './lab-job-workspace-search'
import { humanizeStatus } from './OrderStatusBadge'

export function LabJobShippingWorkspace({ order, workspace, onWorkspaceChange, headerTarget, sendActionTarget, sampleReviewTarget, orderActions, orderDialogOpen, onActivityChange, navigationLocked = false, onNavigationLockChange, onKitSupplyChange, pairWorkspace, pairState, onPairRefresh, taskOnly = false }: {
  order: LabServiceOrder
  workspace: LabJobWorkspaceSearch
  onWorkspaceChange: ChangeLabJobWorkspace
  headerTarget: HTMLElement | null
  sendActionTarget?: HTMLElement | null
  sampleReviewTarget?: HTMLElement | null
  orderActions: ShipmentHeaderAction[]
  orderDialogOpen: boolean
  onActivityChange: (active: boolean) => void
  navigationLocked?: boolean
  onNavigationLockChange?: (active: boolean) => void
  onKitSupplyChange?: (supply: ShipmentKitSupply | undefined) => void
  pairWorkspace?: LabSampleTubeWorkspace
  pairState?: 'loading' | 'unavailable' | 'ready'
  onPairRefresh?: () => void
  taskOnly?: boolean
}) {
  const { allowed, shipments, related, retired, receiptState } = useSourceSampleShipments(order.id)
  const [sampleActionsTarget, setSampleActionsTarget] = useState<HTMLDivElement | null>(null)
  const fallbackActionRef = useRef<HTMLButtonElement>(null)
  const fallbackSendRef = useRef<HTMLButtonElement>(null)
  const phaseId = order.usesPairedPreparation ? workspace.phaseId : undefined
  const phaseSampleIds = new Set(order.samples.filter(s => !phaseId || s.phaseId === phaseId).map(s => s.id))
  const phasePrepared = phaseId ? pairWorkspace?.preparedPhaseIds?.includes(phaseId) === true : Boolean(order.sampleRosterFinalizedAt)
  const phaseKits = useQuery({ queryKey: ['lab-phase-kit-supply', order.id, undefined], queryFn: () => getLabPhaseKitSupply(order.id), enabled: Boolean(order.usesPairedPreparation && order.placedAt) })
  const jobShipments = allowed ? related.filter(item => item.organizationId === order.organizationId && ['CustomerLabServiceOrder', 'CustomerPromotionalOrder'].includes(item.authorizationSource) && (!phaseId || item.crosswalk.length > 0 && item.crosswalk.every(row => phaseSampleIds.has(row.submittedSpecimenId)))) : []
  const selected = workspace.shipmentId
    ? [...jobShipments, ...retired.filter(item => allowed && item.organizationId === order.organizationId && ['CustomerLabServiceOrder', 'CustomerPromotionalOrder'].includes(item.authorizationSource) && (!phaseId || item.crosswalk.length > 0 && item.crosswalk.every(row => phaseSampleIds.has(row.submittedSpecimenId))))].find(item => item.id === workspace.shipmentId)
    : jobShipments.length === 1 ? jobShipments[0] : undefined
  const unknownSelection = Boolean(workspace.shipmentId && !selected && receiptState === 'ready')
  const tubesView = workspace.shippingView === 'tubes'
  const specimenSources = Object.fromEntries(order.samples.map(sample => [sample.id, sample.biologicalSource]))
  const matchedSlots = new Set(jobShipments.flatMap(item => item.crosswalk.filter(row => row.supplierTubeBarcode).map(row => row.tubeSlotId ?? `${item.id}:${row.shipmentItemId}:${row.tubeOrdinal ?? 1}`)))
  const expected = phaseId ? order.phaseScopes?.find(p => p.id === phaseId)?.scope.sources.reduce((total, s) => total + s.specimenCount, 0) : jobShipments.find(item => item.orderExpectedTubeCount !== undefined)?.orderExpectedTubeCount
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
      <LabJobWorkspaceActions orderActions={[command].map(item => ({ ...item,
        disabled: item.disabled || navigationLocked || orderDialogOpen || !allowed || receiptState !== 'ready' || shipments.isFetching }))}
        triggerRef={triggerRef} dialogOpen={orderDialogOpen} />
      {jobShipments.length > 1 && selected && action ? <p className="max-w-64 text-xs text-muted-foreground wrap-anywhere">{selected.shipmentNumber}</p> : null}
    </div>, sendActionTarget)
  }
  const awaitingPairedPreparation = order.usesPairedPreparation && order.placedAt && !phasePrepared
  const hasReceivedCompatibleKit = pairState === 'ready' && Boolean(pairWorkspace?.pairs.some(pair => pair.phaseId === phaseId)
    || pairWorkspace?.kits.some(kit => kit.phaseId === phaseId && kit.availableTubeCount > 0)
    || phaseKits.data?.requests.some(request => request.phaseId === phaseId && request.kits.some(kit => kit.receivedAt)))
  const submissionInstructions = order.submissionInstructions?.trim()
  const pairedWorkspaceDescription = !order.placedAt
    ? 'Confirm the order before preparing samples.'
    : phasePrepared
      ? 'Review each shipping insert and record carrier handoff.'
      : hasReceivedCompatibleKit
        ? 'Save one Sample ID and physical tube barcode at a time.'
        : 'Request or receive this phase’s transportation kits above.'
  const renderSamples = (context?: SampleTubeListContext) => order.usesPairedPreparation
    ? taskOnly && phasePrepared ? null : phasePrepared || hasReceivedCompatibleKit ? <LabJobPairedPreparation key={`${order.id}:${phaseId}`} order={order} phaseId={phaseId} /> : null
    : <LabJobSamplesPanel key={order.id} order={order} embedded actionsTarget={sampleActionsTarget} reviewActionTarget={sampleReviewTarget}
    tubeShipments={allowed ? selected?.status === 'Cancelled' ? [...jobShipments, selected] : jobShipments : undefined} tubeContext={context} navigationLocked={navigationLocked || orderDialogOpen}
    page={(workspace.samplePage ?? 1) - 1} onPageChange={page => change({ samplePage: page ? page + 1 : undefined })} />
  return <Card id="samples-and-shipping" tabIndex={-1} className="min-w-0 scroll-mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    {!taskOnly ? <CardHeader>
      <CardTitle>Samples and shipping</CardTitle>
      <CardAction ref={setSampleActionsTarget} className="row-span-1 flex flex-wrap justify-end gap-2 empty:hidden" />
      <CardDescription className="col-span-full row-start-2 text-left">{order.usesPairedPreparation ? pairedWorkspaceDescription : order.sampleRosterFinalizedAt ? 'Review your samples, prepare each container and record its shipment here.' : 'Identify each accepted sample below, then review and finalize the list before preparing your shipment.'}</CardDescription>
    </CardHeader> : null}
    <CardContent className={taskOnly ? 'space-y-5 pt-4' : 'space-y-5'}>
      {!selected && headerTarget ? createPortal(<LabJobWorkspaceActions orderActions={orderActions} shipmentActions={fallbackShippingActions} triggerRef={fallbackActionRef} dialogOpen={orderDialogOpen} />, headerTarget) : null}
      {!selected ? renderSendAction(null, fallbackSendRef) : null}
      {allowed && (jobShipments.length > 1 || (!selected || selected.status === 'Cancelled') && jobShipments.length > 0) ? <Field>
        <Label htmlFor="job-shipment-selector">Shipping container</Label>
        <NativeSelect id="job-shipment-selector" aria-describedby={!selected && hasSentInsert ? 'job-shipment-reprint-hint' : undefined} value={selected?.id ?? ''} disabled={navigationLocked || orderDialogOpen || Boolean(shipments.error) || shipments.isFetching} onChange={event => change({ shipmentId: event.target.value || undefined, orderKits: undefined })}>
          <option value="">Select a container</option>
          {jobShipments.map(item => <option key={item.id} value={item.id}>{item.isPackingPool ? 'Tubes awaiting containers' : item.shipmentNumber} · {item.crosswalk.length} tubes · {humanizeStatus(item.status)} · {item.destinationName}</option>)}
          {selected?.status === 'Cancelled' ? <option value={selected.id}>{selected.shipmentNumber} · Retired</option> : null}
        </NativeSelect>
        {!selected && hasSentInsert ? <p id="job-shipment-reprint-hint" className="text-sm text-muted-foreground">Select a shipping container to reprint its shipping insert.</p> : null}
      </Field> : null}
      {selected ? <p className="text-sm wrap-anywhere"><span className="font-medium">{selected.isPackingPool ? 'Tubes awaiting containers' : `Selected shipment: ${selected.shipmentNumber}`}</span> · {humanizeStatus(selected.status)} · {selected.destinationName}</p> : null}
      {unknownSelection ? <Alert><AlertTitle>Selected shipment is not available for this Job</AlertTitle><AlertDescription>Choose a current container to continue. <Button variant="outline" onClick={() => change({ shipmentId: undefined, orderKits: undefined })}>Choose current container</Button></AlertDescription></Alert> : null}
      {shipments.error ? <Alert variant="destructive"><AlertTitle>Shipping information could not be loaded</AlertTitle><AlertDescription>Your sample list is preserved. <Button variant="outline" onClick={() => void shipments.refetch()}>Retry shipments</Button></AlertDescription></Alert> : null}
      {awaitingPairedPreparation && !hasReceivedCompatibleKit ? pairState === 'loading'
        ? <p role="status" className="text-sm text-muted-foreground">Checking for a received, compatible kit…</p>
        : pairState === 'unavailable'
          ? <Alert variant="destructive"><AlertTitle>Kit receipt could not be checked</AlertTitle><AlertDescription>Refresh the kit status before preparing samples. {onPairRefresh ? <Button type="button" variant="outline" size="sm" onClick={onPairRefresh}>Retry</Button> : null}</AlertDescription></Alert>
          : null : null}
      {submissionInstructions && (!order.usesPairedPreparation || hasReceivedCompatibleKit) ? <section aria-label="Sample preparation instructions" className="rounded-md border bg-muted/30 px-4 py-3 text-sm"><h3 className="font-medium">Sample preparation instructions</h3><p className="mt-1 whitespace-pre-wrap wrap-anywhere text-muted-foreground">{submissionInstructions}</p></section> : null}
      {!selected ? renderSamples() : null}
      {selected ? <SampleShippingDetailPage key={selected.id} shipmentId={selected.id} autoOpenKitOrder={workspace.orderKits} embedded={{
        sourceId: order.id,
        specimenSources,
        sampleOrder: groupSampleRows(order).flatMap(group => group.samples.map(sample => sample.id)),
        jobTubeProgress,
        onActivityChange,
        onNavigationLockChange,
        onKitSupplyChange,
        showPreparation: tubesView,
        showKitDelivery: !taskOnly,
        renderSamples,
        scanActionsTarget: sampleActionsTarget,
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
