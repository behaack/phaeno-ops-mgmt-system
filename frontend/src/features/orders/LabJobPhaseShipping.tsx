import { LoadingState } from '#/components/ui/content-state'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, PackageCheck, ScanBarcode, Truck } from 'lucide-react'
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
import { WorkflowProgress } from '#/components/ui/workflow-progress'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { LabJobKitDeliveryPanel } from './LabJobKitDeliveryPanel'
import { hasMultipleLabPhases, labSampleCount } from './lab-job-presentation'
import { currentShippingPhase, phaseShippingProgress } from './lab-phase-shipping'
import { useOrderDecisionDismissal } from './use-order-decision-dismissal'

const schema = z.object({ phaseIds: z.array(z.string()).length(1, 'Request kits for the current shipping step.'), deliveryLocationId: z.string().min(1, 'Choose a delivery address.') })
const steps = [
  { id: 'request', label: 'Request transportation kits', icon: Package },
  { id: 'receive', label: 'Receive kits', icon: PackageCheck },
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
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const [receiptRequestId, setReceiptRequestId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const requestCancel = useRef<HTMLButtonElement>(null)
  const opened = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { phaseIds: [], deliveryLocationId: '' } })
  const { isDirty: __formDraftDirty } = form.formState

  const locationId = form.watch('deliveryLocationId')
  const selectedPhases = form.watch('phaseIds')
  const currentPhase = phaseState === 'ready' ? currentShippingPhase(phasePlan?.phases, order, pairs, shipments) : undefined
  const multiplePhases = hasMultipleLabPhases(order, phasePlan)
  const currentPhaseTitle = currentPhase
    ? `Phase ${currentPhase.position}${currentPhase.name.trim().toLowerCase() === `phase ${currentPhase.position}` ? '' : ` · ${currentPhase.name}`}`
    : null
  const shippingTitle = multiplePhases
    ? currentPhase ? `Shipping: ${currentPhaseTitle} (${labSampleCount(currentPhase.sampleCount)})` : 'Shipping'
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
  const dismissal = useOrderDecisionDismissal(requestOpen && __formDraftDirty, requestOpen && request.isPending,
    () => onRequestOpenChange(false), { scope: 'kit request', description: __customerText('m_79a9ea9fb5aa') })
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
      {phase && progress ? canManage && (showKitOrder || progress.allSent) ? <ActionMenu><DropdownMenuTrigger asChild><Button id="phase-shipping-actions" variant="outline" size="sm" disabled={actionsDisabled}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-56 max-w-[calc(100vw-2rem)]">
        {showKitOrder ? <DropdownMenuItem onSelect={() => showReceipt(progress.request!.id)}><CustomerText message="m_14f8f70a5301" /></DropdownMenuItem> : null}
        {progress.allSent ? <DropdownMenuItem onSelect={() => onStepSelect('send')}><CustomerText message="m_9c78cb4b47bc" /></DropdownMenuItem> : null}
      </DropdownMenuContent></ActionMenu> : showKitOrder ? <Button variant="outline" size="sm" disabled={actionsDisabled} onClick={() => showReceipt(progress.request!.id)}><CustomerText message="m_14f8f70a5301" /></Button> : null : null}
    </CardHeader>
    <CardContent className="space-y-4">
      {supply.isLoading ? <LoadingState  label={<><CustomerText message="m_299c1fe2030f" /></>} /> : null}
      {phaseState === 'loading' ? <LoadingState  label={<><CustomerText message="m_1ef78cea439f" /></>} /> : null}
      {phaseState === 'unavailable' ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_369fb7cd3a65" /></AlertTitle><AlertDescription><CustomerText message="m_025c064ce062" /><Button variant="outline" onClick={onPhaseRefresh}><CustomerText message="m_edb85d9febd3" /></Button></AlertDescription></Alert> : null}
      {phase && !progress && !supply.error ? <LoadingState  label={<><CustomerText message="m_f186bf2d370b" /></>} /> : null}
      {supply.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_a0ff4cb29ec9" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(supply.error, 'Your order is preserved.')} />} <Button variant="outline" onClick={() => void supply.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      {phase && progress ? <>
        <WorkflowProgress label={multiplePhases ? __customerText('m_334733a021ec', { p0: String(phase.phaseName) }) : __customerText('m_a588a5f0da90')} horizontalAt="md" steps={steps.map((step, index) => {
          const nextIndex = steps.findIndex(s => s.id === progress.next)
          const complete = progress.allSent || nextIndex > index
          const current = progress.next === step.id
          const note = step.id === 'receive' ? progress.receiveStatus : step.id === 'request' && progress.usesReceivedStock && complete ? 'Existing kits allocated' : null
          return { ...step, complete, current, description: note ? <span role={step.id === 'receive' ? "status" : undefined}>{note}</span> : undefined }
        })} />
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between" aria-live="polite"><div className="min-w-0 flex-1 text-sm"><p className="text-xs text-muted-foreground"><CustomerText message="m_298a9207a732" /></p><p className="font-semibold">{nextTitle}</p>{progress.next === 'prepare' && progress.usesReceivedStock ? <p className="text-muted-foreground"><CustomerText message="m_ddf93d8fff52" />{multiplePhases ? <CustomerSourceText source={"phase"} /> : __customerText('m_3eeb7e96e59c')} <CustomerText message="m_3c6bfe0ec813" />{progress.kits.length} <CustomerText message="m_e10d340650bb" />{progress.kits.length === 1 ? '' : 's'}<CustomerText message="m_6dfae44753eb" />{labSampleCount(phase.sampleCount)}<CustomerText message="m_213087a5a7c7" /></p> : null}<p className="text-muted-foreground">{earlierOpenRequest ? __customerText('m_cbacd32d7533', { p0: String(multiplePhases ? 'phase' : 'order') }) : waitingForKitDispatch ? "Phaeno is preparing the outstanding kits. You can record their receipt after Phaeno sends them and they physically arrive." : progress.next === 'request' ? __customerText('m_4f843eb0df88', { p0: String(multiplePhases ? 'this phase is' : 'you’re') }) : progress.next === 'receive' ? "Phaeno has sent kits. Confirm each kit only after it physically arrives." : progress.next === 'prepare' ? __customerText('m_462be4c5f3c6', { p0: String(multiplePhases ? 'this phase’s' : 'your') }) : progress.next === 'send' ? "Review each insert, pack the matching kit, and record carrier handoff." : __customerText('m_afe645f8f8ef')}</p></div>
          {progress.next === 'send' && sendActionTargetRef ? <div ref={sendActionTargetRef} className="max-w-full shrink-0 self-end sm:self-center" /> : nextButton ? <Button id="phase-next-step" className="shrink-0 self-end sm:self-center" disabled={nextDisabled} onClick={executeNext}>{nextButton}</Button> : null}
        </div>
        {currentPhase?.cancellationPending ? <p className="text-sm text-muted-foreground"><CustomerText message="m_2a38c854a74b" />{multiplePhases ? <CustomerSourceText source={"phase’s"} /> : __customerText('m_0ad7bcae2c46')} <CustomerText message="m_288257988a45" /></p> : !canManage && ['request', 'prepare'].includes(progress.next ?? '') ? <p className="text-sm text-muted-foreground"><CustomerText message="m_7ac380e05c4f" /></p> : null}
        {!phase.canRequest && progress.next === 'request' ? <p className="text-sm text-muted-foreground">{phase.blockedReason}</p> : null}
        {phaseRequests.length > 1 ? <ul className="space-y-1 text-sm" aria-label={__customerText('m_48f2cad0b34c')}>{phaseRequests.map(r => <li key={r.id}><Button variant="link" size="sm" onClick={() => showReceipt(r.id)}><CustomerText message="m_6c8c331ed202" />{r.id.slice(0, 8).toUpperCase()} · {r.status}</Button></li>)}</ul> : null}
      </> : null}
      {phaseState === 'ready' && phasePlan && phasePlan.phases.length > 0 && !currentPhase ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm"><div><p className="font-semibold">{multiplePhases ? <CustomerSourceText source={"Phase shipping finished"} /> : __customerText('m_873037127288')}</p><p className="text-muted-foreground"><CustomerText message="m_15530b5716b3" /></p></div><Button className="w-44 max-w-full" disabled={actionsDisabled} onClick={() => onStepSelect('phase-progress')}><CustomerText message="m_c2e39c2cee78" /></Button></div> : null}
      {unassigned.length ? <div className="space-y-2 border-t pt-3"><p className="text-sm text-muted-foreground"><CustomerText message="m_23ee3686c03c" />{multiplePhases ? <CustomerSourceText source={"phase"} /> : __customerText('m_3eeb7e96e59c')} <CustomerText message="m_d77276b984a4" /></p>{unassigned.map(r => <Button key={r.id} variant="link" size="sm" onClick={() => showReceipt(r.id)}><CustomerText message="m_4e1e2cc89a61" />{r.id.slice(0, 8).toUpperCase()} · {r.status}</Button>)}</div> : null}
      {earlierPhases.length ? <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_a9e15b286938" /></summary><div className="mt-2 space-y-2">{earlierPhases.map(r => <Button key={r.id} variant="link" size="sm" onClick={() => showReceipt(r.id)}>{r.phaseName ?? 'Earlier phase'} · {r.status} <CustomerText message="m_97d5fe27b717" /></Button>)}</div></details> : null}
    </CardContent>
    <Dialog open={requestOpen} onOpenChange={open => { if (!open) dismissal.close() }}><DialogContent showCloseButton={!request.isPending} aria-busy={request.isPending} onOpenAutoFocus={event => { event.preventDefault(); requestCancel.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogHeader><DialogTitle><CustomerText message="m_98b63abcb4a3" /></DialogTitle></DialogHeader>
      <form onSubmit={form.handleSubmit(values => request.mutate(values))} className="contents">
        <div className="space-y-4"><DialogDescription><CustomerText message="m_d3c5e690846b" />{multiplePhases ? phase?.phaseName ?? 'the current phase' : __customerText('m_27f0d486b628')} <CustomerText message="m_a0dea5cd635c" /></DialogDescription>
          <Field><Label htmlFor="phase-kit-delivery-address"><RequiredFieldName><CustomerText message="m_eb4c6f564086" /></RequiredFieldName></Label><NativeSelect id="phase-kit-delivery-address" {...form.register('deliveryLocationId')} value={locationId} disabled={request.isPending}><option value=""><CustomerText message="m_d5578ec0841e" /></option>{supply.data?.locations.map(l => <option key={l.id} value={l.id}>{l.label} · {l.line1}, {l.city}</option>)}</NativeSelect><FieldError>{form.formState.errors.deliveryLocationId?.message}</FieldError>{selectedLocation ? <DeliveryLocationAddress location={selectedLocation} /> : null}</Field>
          {phase ? <div className="rounded-md border p-3 text-sm"><strong>{multiplePhases ? `${phase.phaseName} · ` : ''}{labSampleCount(phase.sampleCount)}</strong><p className="text-muted-foreground">{phase.canRequest ? __customerText('m_5250772dde68', { p0: String(phase.recommendation.containerCount), p1: String(phase.recommendation.containerCount === 1 ? '' : 's'), p2: String(phase.receivedStock.length ? ' · compatible received stock considered' : '') }) : phase.blockedReason}</p></div> : null}<FieldError>{form.formState.errors.phaseIds?.message}</FieldError>
          <p className="text-xs text-muted-foreground">{multiplePhases ? <CustomerSourceText source={"Each phase gets its own kits. "} /> : ''}<CustomerText message="m_06d440097857" />{multiplePhases ? <CustomerSourceText source={"phase"} /> : __customerText('m_3eeb7e96e59c')} <CustomerText message="m_edab39373e15" /></p>
          {!supply.data?.locations.length ? <p className="text-sm"><CustomerText message="m_c0bc9baf3c83" /></p> : null}
          {request.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_237d26fd2de5" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(request.error, 'Your selections are preserved. Review the current requirement and try again.')} />}</AlertDescription></Alert> : null}
        </div>
        <RequiredDialogFooter><Button ref={requestCancel} type="button" variant="outline" disabled={request.isPending} onClick={dismissal.close}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" disabled={request.isPending || supply.isFetching || !phase?.canRequest || selectedPhases.length !== 1 || selectedPhases[0] !== phase?.phaseId || !selectedLocation}>{request.isPending ? <CustomerSourceText source={"Requesting…"} /> : __customerText('m_543daad16249')}</Button></RequiredDialogFooter>
      </form>
    </DialogContent></Dialog>
    {dismissal.confirmation}
    <LabJobKitDeliveryPanel orderId={order.id} requestId={receiptRequestId ?? undefined} canConfirm={canManage} open={Boolean(receiptRequestId)} onOpenChange={open => { if (!open) setReceiptRequestId(null) }} restoreFocus={restoreFocus} />
  </Card></div>
}
