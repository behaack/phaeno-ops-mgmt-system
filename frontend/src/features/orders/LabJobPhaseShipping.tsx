import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Package, ScanBarcode, Truck } from 'lucide-react'
import { useEffect, useRef, useState, type Ref } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage, type LabSampleTubeWorkspace, type LabServiceOrder } from '#/api/order-management'
import type { LabPhasePlan } from '#/api/lab-phases'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { getLabPhaseKitSupply, requestLabPhaseKits } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { cn } from '#/lib/utils'
import { LabJobKitDeliveryPanel } from './LabJobKitDeliveryPanel'
import { hasMultipleLabPhases, labSampleCount } from './lab-job-presentation'
import { currentShippingPhase, phaseShippingProgress } from './lab-phase-shipping'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

const schema = z.object({ phaseIds: z.array(z.string()).length(1, 'Request kits for the current shipping step.'), deliveryLocationId: z.string().min(1, 'Choose a delivery address.') })
const steps = [
  { id: 'request', label: 'Request transportation kits', icon: Package },
  { id: 'receive', label: 'Receive kits', icon: Package },
  { id: 'prepare', label: 'Prepare sample shipment', icon: ScanBarcode },
  { id: 'send', label: 'Send and record shipments', icon: Truck },
] as const

export function LabJobPhaseShipping({ order, phasePlan, phaseState, onPhaseRefresh, pairs, shipments, shippingReady, canManage, actionsDisabled = false, requestOpen, onRequestOpenChange, onStepSelect, onModalChange, sendActionTargetRef }: {
  order: LabServiceOrder; phasePlan?: LabPhasePlan; phaseState: 'loading' | 'unavailable' | 'ready'; onPhaseRefresh: () => void
  pairs?: LabSampleTubeWorkspace; shipments: SampleShipmentWorkflow[]; shippingReady: boolean
  canManage: boolean; actionsDisabled?: boolean; requestOpen: boolean; onRequestOpenChange: (open: boolean) => void
  onStepSelect: (step: string) => void; onModalChange: (open: boolean) => void
  /** The selected shipment supplies the current Send command and owns its dialog. */
  sendActionTargetRef?: Ref<HTMLDivElement>
}) {
  const client = useQueryClient()
  const [receiptRequestId, setReceiptRequestId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const requestCancel = useRef<HTMLButtonElement>(null)
  const opened = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { phaseIds: [], deliveryLocationId: '' } })
  const locationId = form.watch('deliveryLocationId')
  const selectedPhases = form.watch('phaseIds')
  const currentPhase = phaseState === 'ready' ? currentShippingPhase(phasePlan?.phases, order, pairs, shipments) : undefined
  const multiplePhases = hasMultipleLabPhases(order, phasePlan)
  const shippingTitle = multiplePhases
    ? currentPhase ? `Shipping: ${currentPhase.name} (${labSampleCount(currentPhase.sampleCount)})` : 'Shipping'
    : `Shipping (${labSampleCount(currentPhase?.sampleCount ?? phasePlan?.sampleCount ?? order.requestedSpecimenCount)})`
  const shippingDescription = phaseState === 'ready' && phasePlan && phasePlan.phases.length > 0 && !currentPhase
    ? 'Track sample receipt, laboratory work and released results in Progress.'
    : multiplePhases ? 'Ship each phase in order. Request the next phase’s kits when ready, after all shipments from the current phase are recorded as sent.'
    : 'Request kits when you’re ready to send your samples.'
  const supply = useQuery({ queryKey: ['lab-phase-kit-supply', order.id, locationId || undefined, currentPhase?.id, phasePlan?.revision], queryFn: () => getLabPhaseKitSupply(order.id, locationId || undefined), enabled: phaseState === 'ready' })
  const phases = supply.data?.phases ?? []
  const phase = phases.find(p => p.phaseId === currentPhase?.id)
  const progress = phase && pairs && shippingReady && !supply.error ? phaseShippingProgress({ id: phase.phaseId, sampleCount: phase.sampleCount }, order, supply.data?.requests ?? [], pairs, shipments) : null
  const defaultLocationId = supply.data?.locations.find(l => l.isDefault)?.id ?? (supply.data?.locations.length === 1 ? supply.data.locations[0].id : '')
  useEffect(() => {
    if (requestOpen && !opened.current) {
      form.reset({ phaseIds: phase ? [phase.phaseId] : [], deliveryLocationId: defaultLocationId })
      const active = document.activeElement
      opener.current = active instanceof HTMLElement && active.getAttribute('role') !== 'menuitem'
        && !active.closest('[data-slot="dialog-content"]') ? active
        : document.getElementById('phase-shipping-actions') ?? document.getElementById('phase-next-step')
    }
    opened.current = requestOpen
  }, [requestOpen, phase, defaultLocationId, form])
  useEffect(() => { onModalChange(requestOpen || Boolean(receiptRequestId)) }, [requestOpen, receiptRequestId, onModalChange])
  const request = useMutation({ mutationFn: async (values: z.infer<typeof schema>) => {
    const location = supply.data?.locations.find(l => l.id === values.deliveryLocationId)
    if (!location) throw new Error('The delivery address changed. Review the current addresses.')
    const payload = { orderVersion: order.version, phaseIds: values.phaseIds, deliveryLocationId: location.id, deliveryLocationVersion: location.version }
    const serialized = JSON.stringify(payload)
    if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, key: crypto.randomUUID() }
    return requestLabPhaseKits(order.id, payload, attempt.current.key)
  }, onSuccess: async () => {
    onRequestOpenChange(false)
    await Promise.all([
      client.invalidateQueries({ queryKey: ['lab-phase-kit-supply', order.id] }),
      client.invalidateQueries({ queryKey: ['lab-sample-tube-pairs', order.id] }),
      client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
    ])
  }, onError: async () => { await client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }) } })
  const dismissal = useOrderDecisionDismissal(requestOpen && form.formState.isDirty, requestOpen && request.isPending,
    () => onRequestOpenChange(false), { scope: 'kit request', description: 'Your delivery address selection will be discarded. No kit order will be placed.' })
  const restoreFocus = () => {
    if (opener.current?.isConnected) opener.current.focus()
    else (document.getElementById('phase-next-step') ?? document.getElementById('phase-shipping'))?.focus()
  }
  const showReceipt = (id: string) => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setReceiptRequestId(id) }
  const selectedLocation = supply.data?.locations.find(l => l.id === locationId)
  const phaseRequests = supply.data?.requests.filter(r => r.phaseId === phase?.phaseId) ?? []
  const unassigned = supply.data?.requests.filter(r => !r.phaseId) ?? []
  const earlierOpenRequest = progress?.next === 'request' ? unassigned.find(r => !['Received', 'Cancelled'].includes(r.status)) : undefined
  const earlierPhases = supply.data?.requests.filter(r => r.phaseId && r.phaseId !== phase?.phaseId) ?? []
  const waitingForKitDispatch = progress?.next === 'receive' && !progress.request?.kits.some(kit => kit.dispatchedAt && !kit.receivedAt)
  const showKitOrder = Boolean(progress?.request && (progress.next !== 'receive' || waitingForKitDispatch))
  const nextTitle = earlierOpenRequest ? 'Review earlier kit order' : waitingForKitDispatch ? 'Wait for Phaeno to send kits' : progress?.next === 'request' ? 'Request transportation kits' : progress?.next === 'receive' ? 'Receive transportation kits'
    : progress?.next === 'prepare' ? 'Prepare sample shipment' : progress?.next === 'send' ? 'Send and record shipments' : 'Phase shipped'
  const nextButton = waitingForKitDispatch ? null : earlierOpenRequest ? 'View kit order' : progress?.next === 'request' ? 'Request transportation kits' : progress?.next === 'receive' ? canManage && progress.request?.canConfirmReceipt ? 'Record kit receipt' : 'View kit order'
    : progress?.next === 'prepare' ? 'Prepare samples' : progress?.next === 'send' ? 'Review shipments' : 'View progress'
  const nextDisabled = actionsDisabled || !earlierOpenRequest && currentPhase?.cancellationPending === true && ['request', 'prepare', 'send'].includes(progress?.next ?? '')
    || progress?.next === 'request' && !earlierOpenRequest && (!canManage || !phase?.canRequest || supply.isFetching)
    || progress?.next === 'prepare' && !canManage
  const executeNext = () => {
    if (earlierOpenRequest) showReceipt(earlierOpenRequest.id)
    else if (progress?.next === 'request') { request.reset(); onRequestOpenChange(true) }
    else if (progress?.next === 'receive' && progress.request && !waitingForKitDispatch) showReceipt(progress.request.id)
    else onStepSelect(progress?.next ?? 'phase-progress')
  }
  return <div className="space-y-4"><Card id="phase-shipping" tabIndex={-1} className="scroll-mt-6">
    <CardHeader className="flex flex-row flex-wrap justify-between gap-3">
      <div className="min-w-0 flex-1"><CardTitle><h2>{shippingTitle}</h2></CardTitle><p className="mt-1 text-sm text-muted-foreground">{shippingDescription}</p></div>
      {phase && progress ? canManage && (showKitOrder || progress.allSent) ? <ActionMenu><DropdownMenuTrigger asChild><Button id="phase-shipping-actions" variant="outline" size="sm" disabled={actionsDisabled}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-56 max-w-[calc(100vw-2rem)]">
        {showKitOrder ? <DropdownMenuItem onSelect={() => showReceipt(progress.request!.id)}>View kit order</DropdownMenuItem> : null}
        {progress.allSent ? <DropdownMenuItem onSelect={() => onStepSelect('send')}>Review shipments</DropdownMenuItem> : null}
      </DropdownMenuContent></ActionMenu> : showKitOrder ? <Button variant="outline" size="sm" disabled={actionsDisabled} onClick={() => showReceipt(progress.request!.id)}>View kit order</Button> : null : null}
    </CardHeader>
    <CardContent className="space-y-4">
      {supply.isLoading ? <p role="status">Checking kit requirements…</p> : null}
      {phaseState === 'loading' ? <p role="status">Checking shipping progress…</p> : null}
      {phaseState === 'unavailable' ? <Alert variant="destructive"><AlertTitle>Shipping progress could not be loaded</AlertTitle><AlertDescription>Refresh progress to continue. <Button variant="outline" onClick={onPhaseRefresh}>Retry progress</Button></AlertDescription></Alert> : null}
      {phase && !progress && !supply.error ? <p role="status">Checking sample preparation and shipments…</p> : null}
      {supply.error ? <Alert variant="destructive"><AlertTitle>Kit requirements could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(supply.error, 'Your order is preserved.')} <Button variant="outline" onClick={() => void supply.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {phase && progress ? <>
        <ol className="grid gap-2 sm:grid-cols-4" aria-label={multiplePhases ? `${phase.phaseName} shipping steps` : 'Shipping steps'}>{steps.map((step, index) => {
          const nextIndex = steps.findIndex(s => s.id === progress.next)
          const complete = progress.allSent || nextIndex > index
          const current = progress.next === step.id
          const Icon = complete ? CircleCheck : step.icon
          const note = step.id === 'receive' ? progress.receiveStatus : step.id === 'request' && progress.usesReceivedStock && complete ? 'Existing kits allocated' : null
          return <li key={step.id} aria-current={current ? 'step' : undefined} className={cn('flex items-center gap-2 rounded-md border px-3 py-3 text-sm sm:flex-col sm:text-center', current ? 'border-primary bg-accent/40' : 'border-transparent')}><Icon aria-hidden="true" className="size-5 shrink-0" /><div><span>{step.label}</span>{note ? <p role={step.id === 'receive' ? 'status' : undefined} className="mt-1 text-xs text-muted-foreground">{note}</p> : null}</div>{complete ? <span className="sr-only">Complete</span> : null}</li>
        })}</ol>
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between" aria-live="polite"><div className="min-w-0 flex-1 text-sm"><p className="text-xs text-muted-foreground">Next step</p><p className="font-semibold">{nextTitle}</p>{progress.next === 'prepare' && progress.usesReceivedStock ? <p className="text-muted-foreground">This {multiplePhases ? 'phase' : 'order'} uses {progress.kits.length} previously received kit{progress.kits.length === 1 ? '' : 's'}, covering {labSampleCount(phase.sampleCount)}. No new delivery is needed.</p> : null}<p className="text-muted-foreground">{earlierOpenRequest ? `Review the earlier kit order. Confirm its physical arrivals or cancel it before dispatch, then allocate the received kits to this ${multiplePhases ? 'phase' : 'order'}.` : waitingForKitDispatch ? 'Phaeno is preparing the outstanding kits. You can record their receipt after Phaeno sends them and they physically arrive.' : progress.next === 'request' ? `Request kits and confirm the address when ${multiplePhases ? 'this phase is' : 'you’re'} ready.` : progress.next === 'receive' ? 'Phaeno has sent kits. Confirm each kit only after it physically arrives.' : progress.next === 'prepare' ? `Save and confirm ${multiplePhases ? 'this phase’s' : 'your'} Sample IDs and physical tube barcodes.` : progress.next === 'send' ? 'Review each insert, pack the matching kit, and record carrier handoff.' : 'Track sample receipt, laboratory progress and available results in Progress.'}</p></div>
          {progress.next === 'send' && sendActionTargetRef ? <div ref={sendActionTargetRef} className="max-w-full shrink-0 self-end sm:self-center" /> : nextButton ? <Button id="phase-next-step" className="shrink-0 self-end sm:self-center" disabled={nextDisabled} onClick={executeNext}>{nextButton}</Button> : null}
        </div>
        {currentPhase?.cancellationPending ? <p className="text-sm text-muted-foreground">Phaeno must resolve this {multiplePhases ? 'phase’s' : 'order’s'} cancellation request before you continue preparation or shipping.</p> : !canManage && ['request', 'prepare'].includes(progress.next ?? '') ? <p className="text-sm text-muted-foreground">An organization or department administrator can complete this step.</p> : null}
        {!phase.canRequest && progress.next === 'request' ? <p className="text-sm text-muted-foreground">{phase.blockedReason}</p> : null}
        {phaseRequests.length > 1 ? <ul className="space-y-1 text-sm" aria-label="Kit order history">{phaseRequests.map(r => <li key={r.id}><Button variant="link" size="sm" onClick={() => showReceipt(r.id)}>Kit order {r.id.slice(0, 8).toUpperCase()} · {r.status}</Button></li>)}</ul> : null}
      </> : null}
      {phaseState === 'ready' && phasePlan && phasePlan.phases.length > 0 && !currentPhase ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm"><div><p className="font-semibold">{multiplePhases ? 'Phase shipping finished' : 'Shipping finished'}</p><p className="text-muted-foreground">All required shipments have been sent or cancelled. Follow receipt, laboratory progress and results in Progress.</p></div><Button className="w-44 max-w-full" disabled={actionsDisabled} onClick={() => onStepSelect('phase-progress')}>View progress</Button></div> : null}
      {unassigned.length ? <div className="space-y-2 border-t pt-3"><p className="text-sm text-muted-foreground">Earlier kit orders cover the Job as a whole. Keep their delivery history and assign each received physical kit to its {multiplePhases ? 'phase' : 'order'} when preparing samples.</p>{unassigned.map(r => <Button key={r.id} variant="link" size="sm" onClick={() => showReceipt(r.id)}>View earlier kit order {r.id.slice(0, 8).toUpperCase()} · {r.status}</Button>)}</div> : null}
      {earlierPhases.length ? <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Other phase kit orders</summary><div className="mt-2 space-y-2">{earlierPhases.map(r => <Button key={r.id} variant="link" size="sm" onClick={() => showReceipt(r.id)}>{r.phaseName ?? 'Earlier phase'} · {r.status} · View kit order</Button>)}</div></details> : null}
    </CardContent>
    <Dialog open={requestOpen} onOpenChange={open => { if (!open) dismissal.close() }}><DialogContent showCloseButton={!request.isPending} aria-busy={request.isPending} onOpenAutoFocus={event => { event.preventDefault(); requestCancel.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogHeader><DialogTitle>Request transportation kits</DialogTitle></DialogHeader>
      <form onSubmit={form.handleSubmit(values => request.mutate(values))} className="contents">
        <div className="space-y-4"><DialogDescription>Request kits for {multiplePhases ? phase?.phaseName ?? 'the current phase' : 'your order'} and confirm where they should arrive. Kits and outbound delivery are included in your order.</DialogDescription>
          <Field><Label htmlFor="phase-kit-delivery-address"><RequiredFieldName>Delivery address</RequiredFieldName></Label><NativeSelect id="phase-kit-delivery-address" {...form.register('deliveryLocationId')} value={locationId} disabled={request.isPending}><option value="">Select a Department delivery address</option>{supply.data?.locations.map(l => <option key={l.id} value={l.id}>{l.label} · {l.line1}, {l.city}</option>)}</NativeSelect><FieldError>{form.formState.errors.deliveryLocationId?.message}</FieldError>{selectedLocation ? <DeliveryLocationAddress location={selectedLocation} /> : null}</Field>
          {phase ? <div className="rounded-md border p-3 text-sm"><strong>{multiplePhases ? `${phase.phaseName} · ` : ''}{labSampleCount(phase.sampleCount)}</strong><p className="text-muted-foreground">{phase.canRequest ? `${phase.recommendation.containerCount} new kit${phase.recommendation.containerCount === 1 ? '' : 's'} recommended${phase.receivedStock.length ? ' · compatible received stock considered' : ''}` : phase.blockedReason}</p></div> : null}<FieldError>{form.formState.errors.phaseIds?.message}</FieldError>
          <p className="text-xs text-muted-foreground">{multiplePhases ? 'Each phase gets its own kits. ' : ''}Compatible received stock is allocated to this {multiplePhases ? 'phase' : 'order'} before requesting any shortage.</p>
          {!supply.data?.locations.length ? <p className="text-sm">Add an active Department delivery address before requesting kits.</p> : null}
          {request.error ? <Alert variant="destructive"><AlertTitle>Kit request not submitted</AlertTitle><AlertDescription>{getOrderErrorMessage(request.error, 'Your selections are preserved. Review the current requirement and try again.')}</AlertDescription></Alert> : null}
        </div>
        <RequiredDialogFooter><Button ref={requestCancel} type="button" variant="outline" disabled={request.isPending} onClick={dismissal.close}>Cancel</Button><Button type="submit" disabled={request.isPending || supply.isFetching || !phase?.canRequest || selectedPhases.length !== 1 || selectedPhases[0] !== phase?.phaseId || !selectedLocation}>{request.isPending ? 'Requesting…' : 'Request kits'}</Button></RequiredDialogFooter>
      </form>
    </DialogContent></Dialog>
    {dismissal.confirmation}
    <LabJobKitDeliveryPanel orderId={order.id} requestId={receiptRequestId ?? undefined} canConfirm={canManage} open={Boolean(receiptRequestId)} onOpenChange={open => { if (!open) setReceiptRequestId(null) }} restoreFocus={restoreFocus} />
  </Card></div>
}
