import { SectionPanel } from '#/components/ui/section-panel'
import { LoadingState } from '#/components/ui/content-state'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { shippingTones } from '#/features/sample-shipping/shipping-status'
import { FieldError } from '#/components/ui/field'
import { Field as PortalField } from '#/components/ui/field'
import { PageTitle } from '#/components/ui/page-header'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import { Download, Printer, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
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
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { SampleTubeScanner, type SampleTubeListContext } from './SampleTubeScanner'
import { TubeMaterialAmountFields, tubeMaterialAmountShape } from './TubeMaterialAmountFields'
import { SampleShipmentPackingPanel } from './SampleShipmentPackingPanel'
import { SampleShipmentResetPacking } from './SampleShipmentResetPacking'
import { ShippingContainerSelector } from './ShippingContainerSelector'
import { ShippingInsertPrintFrame } from './ShippingInsertPrintFrame'
import { SampleShippingPacketPage } from './SampleShippingPacketPage'
import { acknowledgeShippingInsert, isShippingInsertAcknowledged, shippingInsertScope, type ShippingInsertIdentity } from './shipping-insert-acknowledgement'
import { TransportationKitsPanel } from './TransportationKitsPanel'
import type { RecordListSearch } from '#/components/RecordPagination'
import { getShipmentKitSupply, type ShipmentKitSupply } from '#/api/transportation-kit-requests'

const assignmentSchema = z.object({ supplierBarcode: z.string().trim().min(4, 'Scan or enter the complete tube barcode.').max(100), reason: z.string().trim().max(1000), ...tubeMaterialAmountShape })
const shipmentSchema = z.object({ carrier: z.string().trim().min(1, 'Enter the carrier.').max(255), trackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), shippedAt: z.string().min(1, 'Enter the shipment time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid shipment time.') })
type AssignmentValues = z.infer<typeof assignmentSchema>
type ShipmentValues = z.infer<typeof shipmentSchema>
export type ShipmentHeaderAction = {
  label: string
  icon?: LucideIcon
  disabled?: boolean
  busy?: boolean
  descriptionId?: string
  variant?: 'default' | 'outline' | 'destructive'
  keepInMenu?: boolean
  kind: 'command'
  onSelect: () => void
}

type EmbeddedShippingWorkspace = {
  sourceId: string
  showPreparation: boolean
  showKitDelivery?: boolean
  renderSamples?: (context?: SampleTubeListContext) => ReactNode
  scanActionsTarget?: HTMLElement | null
  onClosePreparation?: () => void
  onSelectShipment: (id: string) => Promise<void>
  onOpenPreparation: () => void
  renderActions: (actions: ShipmentHeaderAction[], triggerRef: RefObject<HTMLButtonElement | null>, dialogOpen: boolean) => ReactNode
  renderSendAction?: (action: ShipmentHeaderAction | null, triggerRef: RefObject<HTMLButtonElement | null>) => ReactNode
  specimenSources?: Record<string, string>
  sampleOrder?: string[]
  jobTubeProgress?: { matched: number; total: number }
  onActivityChange?: (active: boolean) => void
  onNavigationLockChange?: (active: boolean) => void
  onKitSupplyChange?: (supply: ShipmentKitSupply | undefined) => void
}

export function SampleShippingDetailPage({ shipmentId, autoOpenKitOrder = false, embedded, returnList }: { shipmentId: string; autoOpenKitOrder?: boolean; embedded?: EmbeddedShippingWorkspace; returnList?: RecordListSearch }) {
  const __customerText = useCustomerText()

  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const client = useQueryClient()
  const canView = Boolean(session?.capabilities.canViewSampleShipping)
  const canManage = Boolean(session?.capabilities.canManageSampleShipping)
  const query = useQuery({ queryKey: ['sample-shipment', shipmentId], queryFn: () => getSampleShipment(shipmentId), enabled: canView && authProvider !== 'mock' })
  const sourceMatches = !embedded || query.data?.authorizationSourceId === embedded.sourceId && (query.data.authorizationSource === 'CustomerLabServiceOrder' || query.data.authorizationSource === 'CustomerPromotionalOrder')
  const customerKitSupply = sourceMatches && query.data?.authorizationSource === 'CustomerLabServiceOrder' && getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Customer'
  const [locationSelection, setLocationSelection] = useState<{ shipmentId: string; locationId: string } | null>(null)
  const selectedLocationId = locationSelection?.shipmentId === shipmentId ? locationSelection.locationId : query.data?.departureDeliveryLocationId ?? undefined
  const kitSupply = useQuery({ queryKey: ['transportation-kit-supply', query.data?.authorizationSourceId, shipmentId, selectedLocationId], queryFn: () => getShipmentKitSupply(shipmentId, selectedLocationId), enabled: customerKitSupply && canView && authProvider !== 'mock' })
  const [assignmentItem, setAssignmentItem] = useState<SampleShippingCrosswalkItem | null>(null)
  const [scanActive, setScanActive] = useState(false)
  const [scanPending, setScanPending] = useState(false)
  const [packingOpen, setPackingOpen] = useState(false)
  const [kitActionOpen, setKitActionOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [packetAction, setPacketAction] = useState<'confirm' | null>(null)
  const [printRequest, setPrintRequest] = useState<{ shipmentId: string; scope: string | null } | null>(null)
  const [printFailure, setPrintFailure] = useState<{ shipmentId: string; message: string } | null>(null)
  const [printedInsert, setPrintedInsert] = useState<{ scope: string; insert: ShippingInsertIdentity; checking: boolean } | null>(null)
  const [, setAcknowledgementVersion] = useState(0)
  const headerActionRef = useRef<HTMLButtonElement>(null)
  const sendActionRef = useRef<HTMLButtonElement>(null)
  const reprintActionRef = useRef<HTMLButtonElement>(null)
  const printedCancelRef = useRef<HTMLButtonElement>(null)
  const actionOrigin = useRef<'header' | 'send' | 'reprint'>('header')
  const userId = session?.user?.id
  const acknowledgementScope = canView && authProvider !== 'mock' && userId && selectedOrganizationId && sourceMatches && query.data?.id === shipmentId
    ? shippingInsertScope(userId, selectedOrganizationId, shipmentId)
    : null
  const printing = printRequest?.shipmentId === shipmentId && printRequest.scope === acknowledgementScope
  const printedConfirmation = printedInsert?.scope === acknowledgementScope ? printedInsert : null
  const mayAcknowledgePrint = Boolean(embedded && canManage && query.data?.status === 'ReadyToShip')
  const refetchShipment = query.refetch
  const restoreActionFocus = useCallback(() => {
    // The host unlocks its portal button after our dialog closes. Its target may
    // also be replaced during a refresh, so fall back to the stable Actions menu.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = actionOrigin.current === 'send' ? sendActionRef.current : actionOrigin.current === 'reprint' ? reprintActionRef.current : headerActionRef.current
      const available = [target, headerActionRef.current, document.getElementById('phase-next-step'), document.getElementById('phase-shipping')]
        .find(element => element?.isConnected && !(element instanceof HTMLButtonElement && element.disabled))
      available?.focus({ preventScroll: true })
    }))
  }, [])
  const startPrint = useCallback((origin: 'header' | 'send' | 'reprint' = actionOrigin.current) => {
    actionOrigin.current = origin
    setPrintFailure(null)
    setPrintRequest({ shipmentId, scope: acknowledgementScope })
  }, [acknowledgementScope, shipmentId])
  const finishPrint = useCallback((insert: ShippingInsertIdentity) => {
    setPrintRequest(null)
    // afterprint also fires when printing is cancelled. Only the customer's
    // explicit confirmation below can acknowledge this exact printed revision.
    if (mayAcknowledgePrint && acknowledgementScope) {
      setPrintedInsert({ scope: acknowledgementScope, insert, checking: true })
      // Refresh after the native dialog closes: another operator may have
      // corrected the insert while it was open, or the frame may have printed
      // a newer revision than the controller previously displayed.
      const finishChecking = () => setPrintedInsert(current => current?.scope === acknowledgementScope && current.insert.id === insert.id && current.insert.revision === insert.revision ? { ...current, checking: false } : current)
      void refetchShipment({ cancelRefetch: true }).then(finishChecking, finishChecking)
    } else restoreActionFocus()
  }, [acknowledgementScope, mayAcknowledgePrint, refetchShipment, restoreActionFocus])
  const failPrint = useCallback((message: string) => { setPrintFailure({ shipmentId, message }); setPrintRequest(null); restoreActionFocus() }, [restoreActionFocus, shipmentId])
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['sample-shipment', shipmentId] }), client.invalidateQueries({ queryKey: ['sample-shipments'] }), client.invalidateQueries({ queryKey: ['sample-shipping-packet', shipmentId] }), client.invalidateQueries({ queryKey: ['lab-service-order', query.data?.authorizationSourceId] }), client.invalidateQueries({ queryKey: ['lab-phase-kit-supply', query.data?.authorizationSourceId] }), client.invalidateQueries({ queryKey: ['lab-phases'], predicate: phaseQuery => phaseQuery.queryKey[4] === query.data?.authorizationSourceId }), client.invalidateQueries({ queryKey: ['trial-project', query.data?.authorizationSourceId] })]) }
  const assignment = useMutation({ mutationFn: ({ item, values }: { item: SampleShippingCrosswalkItem; values: AssignmentValues }) => assignSampleTube(shipmentId, item.shipmentItemId, { ...values, customerDeclaredQuantity: Number(values.customerDeclaredQuantity), reason: values.reason || null, version: item.version, tubeSlotId: item.tubeSlotId ?? null }), onSuccess: async () => { setAssignmentItem(null); await refresh() } })
  const issue = useMutation({ mutationFn: (replacementReason: string | null) => issueSampleShippingPacket(shipmentId, { version: query.data!.version, replacementReason }), onSuccess: async () => { setPacketAction(null); await refresh() } })
  const shipped = useMutation({ mutationFn: (values: ShipmentValues) => recordSampleShipment(shipmentId, { carrier: values.carrier, trackingNumber: values.trackingNumber, shippedAt: new Date(values.shippedAt).toISOString(), version: query.data!.version }), onSuccess: async () => { setShipmentOpen(false); await refresh(); restoreActionFocus() } })
  const download = useMutation({ mutationFn: () => downloadSampleShippingCrosswalk(shipmentId), onSuccess: (blob) => { const href = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${query.data?.shipmentNumber ?? 'sample-shipment'}-tube-crosswalk.csv`; anchor.click(); URL.revokeObjectURL(href) } })
  const writePending = assignment.isPending || issue.isPending || shipped.isPending
  useBlocker({ shouldBlockFn: () => writePending || printing || Boolean(printedConfirmation), enableBeforeUnload: writePending })
  const workspaceActive = scanActive || packingOpen || kitActionOpen || resetOpen || Boolean(assignmentItem) || Boolean(packetAction) || shipmentOpen || instructionsOpen || printing || Boolean(printedConfirmation) || assignment.isPending || issue.isPending || shipped.isPending
  const onActivityChange = embedded?.onActivityChange
  useEffect(() => { onActivityChange?.(workspaceActive) }, [onActivityChange, workspaceActive])
  useEffect(() => () => { onActivityChange?.(false) }, [onActivityChange])
  const routeNavigationLocked = scanPending || packingOpen || resetOpen || Boolean(assignmentItem) || Boolean(packetAction) || shipmentOpen || instructionsOpen || printing || Boolean(printedConfirmation) || assignment.isPending || issue.isPending || shipped.isPending
  // Kit dialogs guard their own dirty/pending writes and allow their address-setup link.
  const navigationLocked = routeNavigationLocked || kitActionOpen
  const onNavigationLockChange = embedded?.onNavigationLockChange
  useEffect(() => { onNavigationLockChange?.(routeNavigationLocked) }, [onNavigationLockChange, routeNavigationLocked])
  useEffect(() => () => { onNavigationLockChange?.(false) }, [onNavigationLockChange])
  const onKitSupplyChange = embedded?.onKitSupplyChange
  const currentKitSupply = customerKitSupply && !kitSupply.isFetching && !kitSupply.error ? kitSupply.data : undefined
  useEffect(() => { onKitSupplyChange?.(currentKitSupply) }, [onKitSupplyChange, currentKitSupply])
  useEffect(() => () => { onKitSupplyChange?.(undefined) }, [onKitSupplyChange])

  const Workspace = embedded ? 'div' : 'main'
  const SupportingContext = embedded ? 'details' : 'div'
  const workspaceClassName = embedded ? 'min-w-0' : 'page-wrap px-4 py-8'
  const dialogOpen = Boolean(packetAction) || shipmentOpen || instructionsOpen || Boolean(printedConfirmation) || printing
  const unavailableActions = () => <>{embedded?.renderActions([], headerActionRef, dialogOpen)}{embedded?.renderSendAction?.(null, sendActionRef)}</>
  if (!canView) return <Workspace className={workspaceClassName}>{unavailableActions()}{embedded?.renderSamples?.()}<Alert variant="destructive"><AlertTitle><CustomerText message="m_e2c9a6f62628" /></AlertTitle><AlertDescription><CustomerText message="m_852245df9ee8" /></AlertDescription></Alert></Workspace>
  if (query.isLoading) return <Workspace className={workspaceClassName}>{unavailableActions()}{embedded?.renderSamples?.()}<LoadingState  label={<><CustomerText message="m_bac36166203b" /></>} /></Workspace>
  if (!query.data || !sourceMatches) return <Workspace className={workspaceClassName}>{unavailableActions()}{embedded?.renderSamples?.()}<Alert variant="destructive"><AlertTitle><CustomerText message="m_ed9d858ef049" /></AlertTitle><AlertDescription>{query.data && !sourceMatches ? <CustomerSourceText source={"This shipment does not belong to this Lab Job. Select one of this Job’s containers to continue."} /> : query.error ? apiErrorMessage(query.error) : __customerText('m_4405ffc9c508')}</AlertDescription></Alert></Workspace>
  const shipment = query.data
  const matchedCount = shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length
  const declaredCount = shipment.crosswalk.filter(item => item.customerDeclaredQuantity != null && item.customerDeclaredQuantity > 0 && item.customerDeclaredQuantityUnit).length
  const amountsComplete = shipment.crosswalk.length > 0 && declaredCount === shipment.crosswalk.length
  const retired = shipment.status === 'Cancelled'
  const inventoryBlocked = customerKitSupply && (kitSupply.isFetching || Boolean(kitSupply.error) || !kitSupply.data)
  const preparationAllowed = !retired && !query.error && (!customerKitSupply || !inventoryBlocked && Boolean(kitSupply.data?.canPrepareSamples))
  const containerLocations = kitSupply.data?.locations.filter(location => location.isActive) ?? []
  const departureLocationId = selectedLocationId ?? kitSupply.data?.deliveryLocationId ?? (containerLocations.length === 1 ? containerLocations[0].id : undefined)
  const readyToConfirm = preparationAllowed && (!customerKitSupply || Boolean(shipment.assignedContainer)) && !shipment.isPackingPool && (Boolean(shipment.container) || shipment.returnKit?.status === 'Fulfilled') && matchedCount === shipment.crosswalk.length && amountsComplete && shipment.status === 'Preparing'
  const currentPacket = shipment.currentPacket && !shipment.currentPacket.isVoided ? shipment.currentPacket : null
  const currentShipmentVerified = !query.isFetching && query.fetchStatus !== 'paused' && !query.error
  const sentInsert = Boolean(shipment.shippedAt && !retired && currentPacket)
  const sendActionBlocked = !currentShipmentVerified || !acknowledgementScope || navigationLocked || scanActive
  const insertAcknowledged = isShippingInsertAcknowledged(acknowledgementScope, currentPacket)
  const printedRevisionCurrent = Boolean(currentPacket && printedConfirmation?.insert.id === currentPacket.id && printedConfirmation.insert.revision === currentPacket.revision)
  const canAcknowledgePrintedInsert = canManage && shipment.status === 'ReadyToShip' && preparationAllowed && currentShipmentVerified && !printedConfirmation?.checking && printedRevisionCurrent
  const openConfirmation = (origin: 'header' | 'send') => {
    if (sendActionBlocked || !canManage || !readyToConfirm) return
    actionOrigin.current = origin; issue.reset(); setPacketAction('confirm')
  }
  const openRecordShipment = (origin: 'header' | 'send') => {
    if (sendActionBlocked || !canManage || shipment.status !== 'ReadyToShip' || !preparationAllowed || !amountsComplete || embedded?.renderSendAction && !insertAcknowledged) return
    actionOrigin.current = origin; shipped.reset(); setShipmentOpen(true)
  }
  const openInstructions = (origin: 'header' | 'send') => { actionOrigin.current = origin; setInstructionsOpen(true) }
  let sendAction: ShipmentHeaderAction | null = null
  if (canManage && readyToConfirm && !currentPacket) {
    sendAction = { kind: 'command', label: __customerText('m_d27336b8485a'), disabled: sendActionBlocked, onSelect: () => openConfirmation('send') }
  } else if (shipment.status === 'ReadyToShip' && currentPacket) {
    if (insertAcknowledged && canManage) {
      sendAction = { kind: 'command', label: __customerText('m_747cea6b1a86'), disabled: sendActionBlocked || !preparationAllowed || !amountsComplete, onSelect: () => openRecordShipment('send') }
    } else {
      sendAction = { kind: 'command', label: __customerText('m_84eeca69e626'), icon: Printer, disabled: sendActionBlocked || printing || Boolean(printedConfirmation), busy: printing, onSelect: () => startPrint('send') }
    }
  }
  const error = download.error
  const headerActions: ShipmentHeaderAction[] = []
  if (embedded && canManage && !retired && shipment.status === 'Preparing') {
    if (shipment.isPackingPool) headerActions.push({ kind: 'command', label: __customerText('m_49e0cedab1d0'), disabled: Boolean(query.error), onSelect: embedded.onOpenPreparation })
    else if (matchedCount < shipment.crosswalk.length) headerActions.push({ kind: 'command', label: embedded.renderSamples ? 'Match tubes' : matchedCount ? 'Resume scanning' : 'Start scanning', disabled: !preparationAllowed, onSelect: embedded.onOpenPreparation })
  }
  if (shipment.currentPacket) {
    headerActions.push(
      { kind: 'command', label: __customerText('m_29b1c95fd691'), variant: 'outline', disabled: navigationLocked, onSelect: () => openInstructions('header') },
      { kind: 'command', label: __customerText('m_ff758b7fbdcf'), icon: Download, variant: 'outline', disabled: download.isPending, onSelect: () => download.mutate() },
    )
    if (!embedded?.renderSendAction || insertAcknowledged || sentInsert) headerActions.push({ kind: 'command', label: __customerText('m_84eeca69e626'), icon: Printer, variant: 'outline', disabled: printing || Boolean(printedConfirmation), onSelect: () => startPrint('header') })
  }
  if (canManage && readyToConfirm && !embedded?.renderSendAction) headerActions.push({ kind: 'command', label: __customerText('m_d27336b8485a'), disabled: sendActionBlocked, onSelect: () => openConfirmation('header') })
  if (canManage && shipment.status === 'ReadyToShip' && !embedded?.renderSendAction) headerActions.push({ kind: 'command', label: __customerText('m_747cea6b1a86'), disabled: sendActionBlocked || !preparationAllowed || !amountsComplete, onSelect: () => openRecordShipment('header') })
  const containerLocationControl = customerKitSupply && shipment.isPackingPool && !retired ? <div className="max-w-xl space-y-1.5">{containerLocations.length === 1 && departureLocationId === containerLocations[0].id ? <div><p className="text-sm font-medium"><CustomerText message="m_77ca3a76a5c1" /></p><p className="text-sm">{containerLocations[0].label}</p></div> : <><Label htmlFor="container-location"><CustomerText message="m_77ca3a76a5c1" /></Label><NativeSelect id="container-location" className="w-full" value={departureLocationId ?? ''} disabled={packingOpen || scanActive} onChange={event => setLocationSelection({ shipmentId, locationId: event.target.value })}><option value=""><CustomerText message="m_54c60544411a" /></option>{containerLocations.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</NativeSelect></>}{containerLocations.length > 1 ? <p className="text-xs text-muted-foreground"><CustomerText message="m_2a572525a27e" /></p> : null}{departureLocationId ? <RecordLink asChild><Link to="/delivery-locations/$locationId" params={{ locationId: departureLocationId }} search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId, returnOrderId: embedded?.sourceId }} ><CustomerText message="m_68aa84b034d1" /></Link></RecordLink> : null}</div> : null
  const preparation = shipment.isPackingPool ? <SampleShipmentPackingPanel shipment={shipment} canManage={canManage && !retired} locationInventory={customerKitSupply} locationControl={containerLocationControl} hasLocationChoice={containerLocations.length > 1} deliveryLocationId={departureLocationId} sampleTypeName={kitSupply.data?.sampleTypeName ?? undefined} writesBlocked={Boolean(inventoryBlocked || query.error || customerKitSupply && !departureLocationId)} onOpenChange={setPackingOpen} onSelectShipment={embedded?.onSelectShipment} /> : <SampleTubeScanner key={shipment.id} renderSamples={embedded?.renderSamples} scanActionsTarget={embedded?.scanActionsTarget} scanning={!embedded?.renderSamples || embedded.showPreparation} onStartScanning={embedded?.onOpenPreparation} onStopScanning={embedded?.onClosePreparation} shipment={shipment} canManage={canManage && !retired} requiresAssignedContainer={customerKitSupply} writesBlocked={!preparationAllowed} specimenSources={embedded?.specimenSources} sampleOrder={embedded?.sampleOrder} jobTubeProgress={embedded?.jobTubeProgress} onScanActivityChange={setScanActive} onPendingChange={setScanPending} onCorrect={item => { assignment.reset(); setAssignmentItem(item) }} onAssign={async (item, barcode, amount, unit) => {
    if (!preparationAllowed) throw new Error('Current container information must be verified before saving. Your scan is retained.')
    const saved = await assignSampleTube(shipment.id, item.shipmentItemId, { supplierBarcode: barcode, customerDeclaredQuantity: amount, customerDeclaredQuantityUnit: unit, reason: null, version: item.version, tubeSlotId: item.tubeSlotId ?? null })
    client.setQueryData(['sample-shipment', shipment.id], saved)
    await refresh()
    return saved
  }} />

  return (
    <Workspace className={workspaceClassName}>
      {embedded ? embedded.renderActions(headerActions, headerActionRef, dialogOpen) : <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {returnList ? <BackLink asChild><Link to="/sample-shipping" search={returnList}><CustomerText message="shipment_return_list" /></Link></BackLink> : shipment.authorizationSource === 'CustomerPromotionalOrder' || shipment.authorizationSource === 'CustomerLabServiceOrder' ? (
            <BackLink asChild><Link to="/lab-services/$orderId"
              params={{ orderId: shipment.authorizationSourceId }}
            >
              <CustomerText message="m_5125f85c806e" />{shipment.authorizationReference}
            </Link></BackLink>
          ) : (
            <BackLink asChild><Link to="/order-operations/lab-services/trials/$trialId" params={{ trialId: shipment.authorizationSourceId }}>
              <CustomerText message="m_9ecc2242d329" />{shipment.authorizationReference}
            </Link></BackLink>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PageTitle className="wrap-anywhere">{shipment.shipmentNumber}</PageTitle>
            <DomainStatusBadge status={shipment.status} tones={shippingTones}>{humanize(shipment.status)}</DomainStatusBadge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shipment.authorizationReference} · {shipment.destinationName}</p>
        </div>
        <ShipmentHeaderActions actions={headerActions} triggerRef={headerActionRef} dialogOpen={dialogOpen} />
      </section>}
      {embedded?.renderSendAction?.(sendAction, sendActionRef)}
      {embedded && sentInsert ? <SectionPanel aria-label={__customerText('m_388945d1466a')} className="mb-5" heading={<h3 ><CustomerText message="m_592c7d476214" />{shipment.shipmentNumber}</h3>} description={<><CustomerText message="m_97b110160547" /></>}>

        <Button ref={reprintActionRef} type="button" variant="outline" size="sm" disabled={!currentShipmentVerified || navigationLocked || scanActive} aria-busy={printing || undefined} onClick={() => startPrint('reprint')}><Printer aria-hidden="true" /><CustomerText message="m_7498c830a306" /></Button>
      </SectionPanel> : null}
      <p role="status" className="sr-only">{printing ? <CustomerSourceText source={"Preparing shipping insert for printing…"} /> : ''}</p>
      {printFailure?.shipmentId === shipmentId ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerText message="m_631b4c378dfd" /></AlertTitle><AlertDescription>{<CustomerSourceText source={printFailure.message} />}<Button variant="outline" onClick={() => startPrint()}><CustomerText message="m_d8b8392e2c54" /></Button></AlertDescription></Alert> : null}
      {printing ? <ShippingInsertPrintFrame key={shipmentId} shipmentId={shipmentId} onFinished={finishPrint} onFailure={failPrint} /> : null}
      {error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerText message="m_0c1779c176fa" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(error)} /></AlertDescription></Alert> : null}
      {query.error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerText message="m_64a755144f60" /></AlertTitle><AlertDescription><CustomerText message="m_10d9e5d4c350" /><Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_788074e86fe8" /></Button></AlertDescription></Alert> : null}
      {retired ? <Alert className="mb-5"><AlertTitle><CustomerText message="m_3bbddb731b64" /></AlertTitle><AlertDescription><CustomerText message="m_46884b4d8779" /></AlertDescription></Alert> : null}
      {!retired && !shipment.isPackingPool && ['Preparing', 'ReadyToShip'].includes(shipment.status) && !amountsComplete ? <p role="status" className="mb-5 text-sm text-muted-foreground"><CustomerText message="m_c3904f060942" />{declaredCount} of {shipment.crosswalk.length} <CustomerText message="m_26c7a3c058df" /></p> : null}
      {!embedded ? <ShippingContainerSelector shipment={shipment} action={!retired && shipment.container && !shipment.isPackingPool ? <SampleShipmentResetPacking key={shipment.id} shipment={shipment} canManage={canManage} writesBlocked={Boolean(query.error)} scanActive={scanActive} /> : undefined} /> : null}
      {embedded?.renderSamples ? <div className="mb-5">{shipment.isPackingPool ? embedded.renderSamples() : preparation}</div> : null}
      {!embedded || embedded.showPreparation || embedded.renderSamples ? <>


      <div className={embedded ? "grid min-w-0 gap-5" : "grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]"}>
        {customerKitSupply && !retired && embedded?.showKitDelivery !== false ? <TransportationKitsPanel key={shipment.id} shipment={shipment} canManage={canManage} deliveryLocationId={selectedLocationId} returnOrderId={embedded?.sourceId} autoOpenOrder={autoOpenKitOrder} onActivityChange={setKitActionOpen}>{embedded?.renderSamples && !shipment.isPackingPool ? null : preparation}</TransportationKitsPanel> : embedded?.renderSamples && !shipment.isPackingPool ? null : preparation}
        <SupportingContext className="space-y-5">
          {embedded ? <summary className="cursor-pointer rounded-md border px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"><CustomerText message="m_90bc8d065b5d" /></summary> : null}
          {embedded && !retired && shipment.container && !shipment.isPackingPool ? <SampleShipmentResetPacking key={shipment.id} shipment={shipment} canManage={canManage} writesBlocked={Boolean(query.error)} scanActive={scanActive} onSelectShipment={embedded.onSelectShipment} onActivityChange={setResetOpen} /> : null}
          {shipment.container ? <Card><CardHeader><CardTitle><CustomerText message="m_093db4f01d81" /></CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Info label={__customerText('m_0c7823e8c759')} value={shipment.container.commonName} />{shipment.assignedContainer ? <Info label={__customerText('m_690050a9e7ce')} value={shipment.assignedContainer.kitNumber} /> : null}<Info label={__customerText('m_f88ba99c9b34')} value={shipment.container.sku} /><Info label={__customerText('m_b30453155a8e')} value={`${shipment.crosswalk.length} tubes · ${shipment.container.capacity} usable slots · ${Math.max(0, shipment.container.capacity - shipment.crosswalk.length)} spare`} /><p className="text-xs text-muted-foreground"><CustomerText message="m_dd05090264ee" /></p></CardContent></Card> : null}
          {!customerKitSupply || !shipment.isPackingPool || shipment.returnKit ? <Card><CardHeader><CardTitle><CustomerText message="m_570fc4f91d4b" /></CardTitle><CardDescription><CustomerText message="m_a4bb18b8f9cb" /></CardDescription></CardHeader><CardContent className="space-y-3 text-sm">{shipment.returnKit ? <><Info label={__customerText('m_875d60ed20f4')} value={shipment.returnKit.kitNumber} /><Info label={__customerText('m_557ed347f13c')} value={`${shipment.returnKit.tubeSupplierName} ${shipment.returnKit.tubeProductNumber}`} /><Info label={__customerText('m_5f7f31a4ba86')} value={`${shipment.returnKit.shipperSupplierName} ${shipment.returnKit.shipperProductNumber}`} /><Info label={__customerText('m_f0016065615b')} value={`${shipment.returnKit.tubes.length} of ${shipment.returnKit.requiredTubeCount}`} />{shipment.returnKit.productExpirations?.map(product => <Info key={product.supplierProductId} label={__customerText('m_9579d23d9e6c', { p0: String(product.productNumber) })} value={product.expirationDate ?? (product.canExpire ? 'Unknown' : 'Not required')} />)}<Info label={__customerText('m_675d6573971c')} value={shipment.returnKit.outboundTrackingNumber ?? 'Not yet recorded'} /></> : <p className="text-muted-foreground">{shipment.container ? <CustomerSourceText source={"Confirm the physical container before scanning its permanent barcoded tubes."} /> : __customerText('m_0c8b6e9fcdc9')}</p>}</CardContent></Card> : null}
          {shipment.receivedTubeCount !== undefined ? <Card><CardHeader><CardTitle><CustomerText message="m_c454e55a4871" /></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>{shipment.receivedTubeCount} of {shipment.expectedTubeCount ?? shipment.crosswalk.length} <CustomerText message="m_892ced595c12" /></p>{shipment.orderExpectedTubeCount !== undefined ? <p>{shipment.orderReceivedTubeCount ?? 0} of {shipment.orderExpectedTubeCount} <CustomerText message="m_8f4770faa935" /></p> : null}<p className="text-xs text-muted-foreground"><CustomerText message="m_cb7cd7226741" /></p></CardContent></Card> : null}
          {!shipment.isPackingPool ? <Card><CardHeader><CardTitle><CustomerText message="m_b01c6ff7a667" /></CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li><CustomerText message="m_cf6207aeea38" /></li><li><CustomerText message="m_f52705ca7a00" /></li><li><CustomerText message="m_4ae9c6ea72b4" /></li></ul><p className="mt-4 text-sm font-medium">{matchedCount} of {shipment.crosswalk.length} <CustomerText message="m_015537c4d84f" /></p></CardContent></Card> : null}
        </SupportingContext>
      </div>
      </> : null}

      <TubeAssignmentDialog item={assignmentItem} replacesPacket={Boolean(shipment.currentPacket)} isPending={assignment.isPending} error={assignment.error ? apiErrorMessage(assignment.error) : undefined} onOpenChange={(open) => { if (!open) setAssignmentItem(null) }} onSubmit={(values) => { if (assignmentItem) assignment.mutate({ item: assignmentItem, values }) }} />
      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="sm:max-w-3xl" onCloseAutoFocus={event => { event.preventDefault(); if (!printing) restoreActionFocus() }}>
          <DialogHeader><DialogTitle><CustomerText message="m_1aece7ddfa6b" /></DialogTitle><DialogDescription><CustomerText message="m_6036483b5787" /></DialogDescription></DialogHeader>
          {instructionsOpen ? <SampleShippingPacketPage shipmentId={shipmentId} embedded packingOnly /> : null}
          <DialogFooter><Button variant="outline" onClick={() => setInstructionsOpen(false)}><CustomerText message="m_7d9eb7acb13e" /></Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmPacketDialog action={packetAction} shipmentNumber={shipment.shipmentNumber} sampleCount={new Set(shipment.crosswalk.map((item) => item.shipmentItemId)).size} tubeCount={shipment.crosswalk.length} isPending={issue.isPending} error={issue.error ? apiErrorMessage(issue.error) : undefined} onOpenChange={(open) => { if (!open) setPacketAction(null) }} onConfirm={() => issue.mutate(null)} onReturnFocus={restoreActionFocus} />
      <RecordShipmentDialog open={shipmentOpen} isPending={shipped.isPending} error={shipped.error ? apiErrorMessage(shipped.error) : undefined} onOpenChange={setShipmentOpen} onSubmit={(values) => shipped.mutate(values)} onReturnFocus={restoreActionFocus} />
      <Dialog open={Boolean(printedConfirmation)} onOpenChange={open => { if (!open) setPrintedInsert(null) }}>
        <DialogContent className="sm:max-w-3xl" onOpenAutoFocus={event => { event.preventDefault(); printedCancelRef.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); restoreActionFocus() }}>
          <DialogHeader><DialogTitle><CustomerText message="m_f115d431cc02" /></DialogTitle><DialogDescription><CustomerText message="m_880f481ab189" /></DialogDescription></DialogHeader>
          <div className="space-y-4 text-sm">
            <dl className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div><dt className="text-muted-foreground"><CustomerText message="m_388945d1466a" /></dt><dd className="font-medium wrap-anywhere">{printedConfirmation?.insert.packetNumber} <CustomerText message="m_bf10c9c91719" />{printedConfirmation?.insert.revision}</dd></div>
              <div><dt className="text-muted-foreground"><CustomerText message="m_dfee01bfef72" /></dt><dd className="font-medium wrap-anywhere">{shipment.shipmentNumber}</dd></div>
            </dl>
            {printedConfirmation && printedRevisionCurrent && currentShipmentVerified ? <details open className="border-y py-3">
              <summary className="cursor-pointer font-medium text-primary underline"><CustomerText message="m_1fe0ee711e14" /></summary>
              <div className="mt-3"><SampleShippingPacketPage shipmentId={shipmentId} embedded packingOnly expectedInsert={printedConfirmation.insert} /></div>
            </details> : null}
            <div><p className="font-medium"><CustomerText message="m_b01c6ff7a667" /></p><ul className="mt-2 list-disc space-y-1 pl-5"><li><CustomerText message="m_68dfe01a674b" /></li><li><CustomerText message="m_51e9fcf7969a" /></li></ul></div>
            <p className="text-muted-foreground"><CustomerText message="m_19cd600a3a8d" /></p>
          </div>
          {!currentShipmentVerified || printedConfirmation?.checking ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_799ade2e47a9" />{query.error || query.fetchStatus === 'paused' ? <CustomerSourceText source={"Reconnect if needed and try printing again."} /> : __customerText('m_dc9fc4c3d5f1')}</p> : !printedRevisionCurrent ? <p role="alert" className="text-sm text-destructive"><CustomerText message="m_3d0224b0d9dc" /></p> : shipment.status !== 'ReadyToShip' ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_623180126d9e" /></p> : !preparationAllowed ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_f242c10e15a4" /></p> : null}
          <DialogFooter><Button ref={printedCancelRef} variant="outline" onClick={() => setPrintedInsert(null)}><CustomerText message="m_a9549d7d0636" /></Button><Button disabled={!canAcknowledgePrintedInsert} onClick={() => {
            if (!canAcknowledgePrintedInsert || !printedConfirmation) return
            acknowledgeShippingInsert(printedConfirmation.scope, printedConfirmation.insert)
            setAcknowledgementVersion(version => version + 1)
            setPrintedInsert(null)
          }}><CustomerText message="m_5e5f920ddb9e" /></Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Workspace>
  )
}

function ShipmentHeaderActions({ actions, triggerRef, dialogOpen }: { actions: ShipmentHeaderAction[]; triggerRef: RefObject<HTMLButtonElement | null>; dialogOpen: boolean }) {


  if (!actions.length) return null
  const content = (action: ShipmentHeaderAction) => <>{action.icon ? <action.icon aria-hidden="true" data-icon="inline-start" /> : null}{action.label}</>
  if (actions.length === 1) {
    const action = actions[0]
    return <Button ref={triggerRef} type="button" variant={action.variant} disabled={action.disabled} onClick={action.onSelect} className="self-start">{content(action)}</Button>
  }
  return <ActionMenu>
    <DropdownMenuTrigger asChild><Button ref={triggerRef} type="button" className="self-start"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={event => { if (dialogOpen) event.preventDefault() }}>
      {actions.map(action => <DropdownMenuItem key={action.label} variant={action.variant === 'destructive' ? "destructive" : "default"} disabled={action.disabled} onSelect={action.onSelect}>{content(action)}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </ActionMenu>
}

function TubeAssignmentDialog({ item, replacesPacket, isPending, error, onOpenChange, onSubmit }: { item: SampleShippingCrosswalkItem | null; replacesPacket: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: AssignmentValues) => void }) {
  const __customerText = useCustomerText()

  const form = useForm<AssignmentValues>({ resolver: zodResolver(assignmentSchema), defaultValues: { supplierBarcode: '', reason: '', customerDeclaredQuantity: '', customerDeclaredQuantityUnit: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  useEffect(() => { if (item) form.reset({ supplierBarcode: item.supplierTubeBarcode ?? '', reason: '', customerDeclaredQuantity: item.customerDeclaredQuantity == null ? '' : String(item.customerDeclaredQuantity), customerDeclaredQuantityUnit: item.customerDeclaredQuantityUnit ?? '' }) }, [form, item])
  const barcodeChanged = Boolean(item?.supplierTubeBarcode && item.supplierTubeBarcode !== form.watch('supplierBarcode').trim().toUpperCase())
  const reasonRequired = replacesPacket || item?.customerDeclaredQuantity != null || barcodeChanged
  const close = async (open: boolean) => {
    if (!isPending && (open || !__formDraftDirty || (await confirmPortal('Discard the unsaved tube details?')))) onOpenChange(open)
  }
  const submit = form.handleSubmit((values) => {
    if (reasonRequired && !values.reason.trim()) {
      form.setError('reason', { type: 'required', message: 'Enter a reason for correcting the tube or its material amount.' })
      return
    }
    onSubmit(values)
  })
  return <Dialog open={Boolean(item)} onOpenChange={close}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{item?.supplierTubeBarcode ? <CustomerSourceText source={"Edit tube and material amount"} /> : __customerText('m_5868faf8e3c8')}</DialogTitle>
        <DialogDescription>{item ? __customerText('m_9f7bb2b50164', { p0: String(item.customerSampleId) }) : ''}{replacesPacket ? <CustomerSourceText source={" Saving replaces the current shipping insert with a corrected revision."} /> : ''}</DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form id="tube-assignment" className="grid gap-4" noValidate onSubmit={submit}>
        <PortalField >
          <Label htmlFor="supplier-barcode"><RequiredFieldName><CustomerText message="m_b7eabda0dead" /></RequiredFieldName></Label>
          <Input id="supplier-barcode" autoComplete="off" className="font-mono uppercase" disabled={isPending} aria-invalid={Boolean(form.formState.errors.supplierBarcode)} {...form.register('supplierBarcode')} />
          {form.formState.errors.supplierBarcode ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.supplierBarcode.message} />}</FieldError> : null}
        </PortalField>
        <TubeMaterialAmountFields idPrefix="assignment" quantityField={form.register('customerDeclaredQuantity')} unitField={form.register('customerDeclaredQuantityUnit')} quantityError={form.formState.errors.customerDeclaredQuantity?.message} unitError={form.formState.errors.customerDeclaredQuantityUnit?.message} disabled={isPending} />
        {item?.supplierTubeBarcode ? <PortalField >
          <Label htmlFor="assignment-reason">{reasonRequired ? <RequiredFieldName><CustomerText message="m_f96404674470" /></RequiredFieldName> : __customerText('m_2e2badabaaac')}</Label>
          <p className="text-xs text-muted-foreground"><CustomerText message="m_d156a6b2b8a8" /></p>
          <Input id="assignment-reason" disabled={isPending} aria-invalid={Boolean(form.formState.errors.reason)} {...form.register('reason')} />
          {form.formState.errors.reason ? <FieldError role="alert" >{<CustomerSourceText source={form.formState.errors.reason.message} />}</FieldError> : null}
        </PortalField> : null}
      </form>
      <RequiredDialogFooter>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => close(false)}><CustomerText message="m_19766ed6ccb2" /></Button>
        <Button type="submit" form="tube-assignment" disabled={isPending}>{isPending ? <CustomerSourceText source={"Saving…"} /> : replacesPacket ? "Save and update insert" : __customerText('m_bd47183a80fa')}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function ConfirmPacketDialog({ action, shipmentNumber, sampleCount, tubeCount, isPending, error, onOpenChange, onConfirm, onReturnFocus }: { action: 'confirm' | null; shipmentNumber: string; sampleCount: number; tubeCount: number; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onConfirm: () => void; onReturnFocus: () => void }) {
  const __customerText = useCustomerText()

  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}>
      <DialogHeader className="pr-[var(--dialog-inset)]">
        <DialogTitle className="pr-8"><CustomerText message="m_50b57b608853" /></DialogTitle>
        <DialogDescription className="pr-8"><CustomerText message="m_d2d6ac84b36f" /></DialogDescription>
      </DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="space-y-3 text-sm">
        <p><CustomerText message="m_0e7049acc0d7" /><strong>{shipmentNumber}</strong> <CustomerText message="m_4ff3badc74a0" /><strong>{sampleCount} {sampleCount === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')}</strong> in <strong>{tubeCount} {tubeCount === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')}</strong>.</p>
        <p><CustomerText message="m_56c26f58a044" /></p>
      </div>
      <RequiredDialogFooter showLegend={false}>
        <Button variant="outline" onClick={() => onOpenChange(false)}><CustomerText message="m_34411a1bde47" /></Button>
        <Button disabled={isPending} onClick={onConfirm}>{isPending ? <CustomerSourceText source={"Confirming…"} /> : __customerText('m_e05ffe0e5441')}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function RecordShipmentDialog({ open, isPending, error, onOpenChange, onSubmit, onReturnFocus }: { open: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: ShipmentValues) => void; onReturnFocus: () => void }) {
  const __customerText = useCustomerText()

  const form = useForm<ShipmentValues>({ resolver: zodResolver(shipmentSchema), defaultValues: { carrier: '', trackingNumber: '', shippedAt: localDateTime() } })
  const { isDirty: __formDraftDirty } = form.formState

  useEffect(() => { if (open) form.reset({ carrier: '', trackingNumber: '', shippedAt: localDateTime() }) }, [form, open])
  const dirty = __formDraftDirty
  const close = async (nextOpen: boolean) => {
    if (nextOpen || !isPending && (!dirty || (await confirmPortal('Discard the unsaved shipment details?')))) onOpenChange(nextOpen)
  }
  useBlocker({ shouldBlockFn: async () => open && (isPending || dirty && !(await confirmPortal('Discard the unsaved shipment details?'))), enableBeforeUnload: () => open && (isPending || dirty), disabled: !open })
  const errors = form.formState.errors
  return <Dialog open={open} onOpenChange={close}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}>
      <DialogHeader><DialogTitle><CustomerText message="m_f218ddeba39a" /></DialogTitle><DialogDescription><CustomerText message="m_52ce3816eeba" /></DialogDescription></DialogHeader>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <form id="record-shipment" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <Field id="shipment-carrier" label={__customerText('m_271c535631ff')} error={errors.carrier?.message}><Input id="shipment-carrier" disabled={isPending} aria-required="true" aria-invalid={Boolean(errors.carrier)} aria-describedby={errors.carrier ? "shipment-carrier-error" : undefined} {...form.register('carrier')} /></Field>
        <Field id="shipment-tracking" label={__customerText('m_d56dcd96cae6')} error={errors.trackingNumber?.message}><Input id="shipment-tracking" disabled={isPending} aria-required="true" aria-invalid={Boolean(errors.trackingNumber)} aria-describedby={errors.trackingNumber ? "shipment-tracking-error" : undefined} {...form.register('trackingNumber')} /></Field>
        <Field id="shipment-time" label={__customerText('m_aae7d83c3bb8')} error={errors.shippedAt?.message}><Input id="shipment-time" type="datetime-local" disabled={isPending} aria-required="true" aria-invalid={Boolean(errors.shippedAt)} aria-describedby={errors.shippedAt ? "shipment-time-error" : undefined} {...form.register('shippedAt')} /></Field>
      </form>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => close(false)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form="record-shipment" disabled={isPending}>{isPending ? <CustomerSourceText source={"Saving…"} /> : __customerText('m_747cea6b1a86')}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {

 return <div className="grid gap-1.5"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}</div> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
function localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
