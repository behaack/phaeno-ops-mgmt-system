import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import { PackageCheck, Truck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import { apiErrorMessage } from '#/api/organization-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { cancelTransportationKitRequest, confirmTransportationKitsReceived, getShipmentKitSupply, orderTransportationKits, type ShipmentKitSupply, type TransportationKitOrderInput, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

export function TransportationKitsPanel({ shipment, canManage, deliveryLocationId, returnOrderId, autoOpenOrder = false, onActivityChange, children }: { shipment: SampleShipmentWorkflow; canManage: boolean; deliveryLocationId?: string; returnOrderId?: string; autoOpenOrder?: boolean; onActivityChange?: (active: boolean) => void; children?: ReactNode }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const { selectedDepartmentId } = usePhaenoSession()
  const [action, setAction] = useState<'order' | 'receive' | 'cancel' | null>(autoOpenOrder ? 'order' : null)
  const [operationKeys] = useState(() => new Map<string, string>())
  const [operationVersion, setOperationVersion] = useState(0)
  const [requestSnapshot, setRequestSnapshot] = useState<TransportationKitRequest | null>(null)
  const queryKey = ['transportation-kit-supply', shipment.authorizationSourceId, shipment.id, deliveryLocationId]
  const supply = useQuery({ queryKey, queryFn: () => getShipmentKitSupply(shipment.id, deliveryLocationId) })
  const refresh = async (request: TransportationKitRequest) => {
    client.setQueryData<ShipmentKitSupply>(queryKey, previous => previous ? { ...previous, request } : previous)
    setAction(null)
    await Promise.all([
      client.invalidateQueries({ queryKey: ['transportation-kit-supply', shipment.authorizationSourceId] }),
      client.invalidateQueries({ queryKey: ['sample-shipments'] }),
      client.invalidateQueries({ queryKey: ['sample-shipment', shipment.id] }),
      client.invalidateQueries({ queryKey: ['sample-shipment-packing', shipment.id] }),
      client.invalidateQueries({ queryKey: ['location-kit-inventory'] }),
      client.invalidateQueries({ queryKey: ['lab-service-order', shipment.authorizationSourceId] }),
    ])
  }
  const keyFor = (kind: string, payload: unknown) => { const signature = JSON.stringify([kind, payload]); const key = operationKeys.get(signature) ?? crypto.randomUUID(); operationKeys.set(signature, key); return key }
  const order = useMutation({ mutationFn: (input: TransportationKitOrderInput) => orderTransportationKits(shipment.id, input, keyFor('order', input)), onSuccess: refresh })
  const receive = useMutation({ mutationFn: (stockKitIds: string[]) => confirmTransportationKitsReceived(requestSnapshot!.id, { version: operationVersion, stockKitIds }, keyFor('receive', stockKitIds)), onSuccess: refresh })
  const cancel = useMutation({ mutationFn: (reason: string) => cancelTransportationKitRequest(requestSnapshot!.id, { version: operationVersion, reason: reason.trim() || undefined }, keyFor('cancel', reason.trim())), onSuccess: refresh })
  const active = action === 'order' ? Boolean(canManage && supply.data?.locations.length) : Boolean(action && requestSnapshot)
  useEffect(() => { onActivityChange?.(active) }, [active, onActivityChange])
  useEffect(() => () => { onActivityChange?.(false) }, [onActivityChange])
  const request = supply.data?.request
  const activeRequest = request && request.status !== 'Cancelled' ? request : null
  const available = supply.data?.recordedStock.reduce((sum, item) => sum + item.availableQuantity, 0) ?? 0
  const canPrepare = !supply.error && Boolean(supply.data?.canPrepareSamples) && (available > 0 || Boolean(shipment.assignedContainer || shipment.returnKit))
  const showOrderOptions = !activeRequest && (Boolean(shipment.isPackingPool) || !canPrepare)
    || Boolean(shipment.isPackingPool) && activeRequest?.status === 'Received' && Boolean(supply.data?.canRequestKits)
  const outstandingDelivery = Boolean(activeRequest && activeRequest.status !== 'Received')
  const showKitCard = Boolean(shipment.isPackingPool) || supply.isPending || Boolean(supply.error) || !supply.data || !canPrepare || outstandingDelivery
  const open = (next: typeof action) => { order.reset(); receive.reset(); cancel.reset(); operationKeys.clear(); setRequestSnapshot(supply.data?.request ?? null); setOperationVersion(supply.data?.request?.version ?? 0); setAction(next) }
  return <div className="space-y-5">
    {showKitCard ? <Card><CardHeader><CardTitle>{shipment.isPackingPool ? <CustomerSourceText source={"Transportation kits"} /> : __customerText('m_f3671a095b1c')}</CardTitle>{!supply.isPending && !supply.error && supply.data && canManage && (showOrderOptions || activeRequest?.canCancel || activeRequest?.canConfirmReceipt) ? <CardAction className="flex flex-wrap justify-end gap-2">{showOrderOptions ? <Button disabled={!supply.data.canRequestKits} onClick={() => open('order')}><Truck data-icon="inline-start" /><CustomerText message="m_00314a47441a" /></Button> : activeRequest?.canCancel ? <Button variant="outline" onClick={() => open('cancel')}><CustomerText message="m_bcfdc2e9952c" /></Button> : null}{activeRequest?.canConfirmReceipt ? <Button onClick={() => open('receive')}><PackageCheck data-icon="inline-start" /><CustomerText message="m_964449cbcab1" /></Button> : null}</CardAction> : null}{shipment.isPackingPool ? <CardDescription><CustomerText message="m_9c36cde96916" /></CardDescription> : null}</CardHeader><CardContent className="space-y-4">
      {supply.isPending ? <p role="status"><CustomerText message="m_1bb6960ec2da" /></p> : supply.error || !supply.data ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_0b6aba492de5" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(supply.error)} /> <Button variant="outline" onClick={() => void supply.refetch()}><CustomerText message="m_4d66527586c2" /></Button></AlertDescription></Alert> : <>
        {supply.data.sampleTypeName ? <p className="text-sm"><strong><CustomerText message="m_8dfc56436b67" /></strong> {supply.data.sampleTypeName}</p> : null}
        {activeRequest ? <KitRequestSummary request={activeRequest} /> : null}
        {showOrderOptions ? <>
          {activeRequest?.status === 'Received' ? <p className="font-medium"><CustomerText message="m_8ef6335bb080" /></p> : null}
          {request?.status === 'Cancelled' ? <p role="status" className="font-medium"><CustomerText message="m_d8bb5f366d2e" /></p> : null}
          {canManage ? <>{!supply.data.canRequestKits ? <p className="text-sm text-muted-foreground">{supply.data.requestBlockedReason}</p> : null}{!supply.data.locations.length ? <p><Link to="/delivery-locations" search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId: shipment.id, returnOrderId, resumeKitOrder: true }} className="text-sm text-primary underline"><CustomerText message="m_7a54646fbe31" /></Link></p> : null}</> : <p className="text-sm text-muted-foreground"><CustomerText message="m_92d0104e6796" /></p>}
        </> : null}
        {supply.data.deliveryLocationId ? <p><Link to="/delivery-locations/$locationId" params={{ locationId: supply.data.deliveryLocationId }} search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId: shipment.id, returnOrderId }} className="text-sm text-primary underline"><CustomerText message="m_68aa84b034d1" /></Link></p> : null}
        {!canPrepare && !showOrderOptions && !outstandingDelivery && supply.data.preparationBlockedReason ? <p className="text-sm text-muted-foreground">{supply.data.preparationBlockedReason}</p> : null}
      </>}
    </CardContent></Card> : null}
    {children}
    {action === 'order' && supply.data && canManage && supply.data.locations.length > 0 ? <TransportationKitOrderDialog shipmentId={shipment.id} organizationId={shipment.organizationId} departmentId={selectedDepartmentId ?? ''} returnOrderId={returnOrderId} initial={supply.data} busy={order.isPending} error={order.error} onClose={() => setAction(null)} onConfirm={input => order.mutate(input)} /> : null}
    {action === 'receive' && requestSnapshot ? <KitReceiptDialog request={requestSnapshot} busy={receive.isPending} blocked={supply.isFetching || Boolean(supply.error)} error={receive.error} onClose={() => setAction(null)} onConfirm={ids => receive.mutate(ids)} /> : null}
    {action === 'cancel' && requestSnapshot ? <KitCancellationDialog busy={cancel.isPending} error={cancel.error} onClose={() => setAction(null)} onConfirm={reason => { if (!supply.isFetching && !supply.error) cancel.mutate(reason) }} /> : null}
  </div>
}

function KitLines({ lines }: { lines: Array<{ containerDefinitionId: string; sku: string; commonName: string; tubeCapacity: number; requestedQuantity: number }> }) {
  const __customerText = useCustomerText()

  return <ul className="space-y-2 text-sm">{lines.map(item => <li key={item.containerDefinitionId} className="flex items-start justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{item.commonName}</p><p className="text-xs text-muted-foreground"><CustomerText message="m_7370f6c81297" />{item.sku} · {item.tubeCapacity} <CustomerText message="m_4a75ed599b36" /></p></div><span className="whitespace-nowrap">{item.requestedQuantity} {item.requestedQuantity === 1 ? <CustomerSourceText source={"kit"} /> : __customerText('m_9ea848b63520')}</span></li>)}</ul>
}
function KitRequestSummary({ request }: { request: TransportationKitRequest }) {
  const __customerText = useCustomerText()

  return <div className="space-y-3"><p role="status" className="font-medium">{request.status === 'Pending' ? <CustomerSourceText source={"Kits ordered"} /> : request.status === 'PartiallyDispatched' ? "Some kits are on the way" : request.status === 'Dispatched' ? "Kits on the way" : __customerText('m_f79bb56d4140')}</p><KitLines lines={request.lines} /><DeliveryAddress location={request.deliveryAddress} /><ul className="space-y-2 text-sm">{request.kits.map(kit => <li key={kit.stockKitId} className="rounded-md border p-3"><p className="font-medium">{kit.kitNumber} · {kit.receivedAt ? <CustomerSourceText source={"Received"} /> : __customerText('m_b63a305d73a3')}</p><p>{kit.outboundCarrier} <CustomerText message="m_d5f8fccbb347" />{kit.outboundTrackingNumber}</p></li>)}</ul>{request.status === 'Pending' ? <p className="text-sm text-muted-foreground"><CustomerText message="m_a1d00a067b5c" /></p> : null}</div>
}
function DeliveryAddress({ location }: { location: CustomerDeliveryLocation }) { return <address className="rounded-md bg-muted/40 p-3 text-sm not-italic"><p className="font-medium">{location.label}</p><p>{location.recipient}</p><p>{location.line1}{location.line2 ? `, ${location.line2}` : ''}</p><p>{location.city}, {location.region} {location.postalCode} · {location.countryCode}</p>{location.deliveryInstructions ? <p className="mt-2">{location.deliveryInstructions}</p> : null}</address> }

const locationSchema = z.object({ deliveryLocationId: z.string().min(1, 'Select a delivery location.'), adjustSizes: z.boolean(), sizes: z.array(z.object({ containerDefinitionId: z.string(), quantity: z.unknown() })) }).superRefine((values, context) => {
  if (!values.adjustSizes) return
  values.sizes.forEach((row, index) => { const quantity = Number(row.quantity); if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000 || row.quantity === '') context.addIssue({ code: 'custom', path: ['sizes', index, 'quantity'], message: 'Enter a whole number of kits from 0 to 10,000.' }) })
})
export function TransportationKitOrderDialog({ shipmentId, organizationId, departmentId, returnOrderId, initial, busy, error, onClose, onConfirm }: { shipmentId: string; organizationId: string; departmentId: string; returnOrderId?: string; initial: ShipmentKitSupply; busy: boolean; error: unknown; onClose: () => void; onConfirm: (input: TransportationKitOrderInput) => void }) {
  const __customerText = useCustomerText()

  const [sizes] = useState(() => initial.containerTypes ?? [])
  const form = useForm<z.input<typeof locationSchema>, unknown, z.output<typeof locationSchema>>({ resolver: zodResolver(locationSchema), defaultValues: { deliveryLocationId: initial.deliveryLocationId ?? '', adjustSizes: false, sizes: sizes.map(type => ({ containerDefinitionId: type.id, quantity: initial.recommendation.containers.find(item => item.containerDefinitionId === type.id)?.quantity ?? 0 })) } })
  const { isDirty: __formDraftDirty } = form.formState

  const adjusting = useWatch({ control: form.control, name: 'adjustSizes' })
  const locationId = useWatch({ control: form.control, name: 'deliveryLocationId' })
  const location = initial.locations.find(item => item.id === locationId && item.isActive)
  const query = useQuery({ queryKey: ['transportation-kit-order-preview', shipmentId, locationId], queryFn: () => getShipmentKitSupply(shipmentId, locationId), enabled: Boolean(locationId), initialData: locationId === initial.deliveryLocationId ? initial : undefined, staleTime: 0 })
  const current = query.data ?? (!locationId ? initial : undefined)
  const compatibleIds = new Set((current?.containerTypes ?? (current ? sizes : [])).map(type => type.id))
  const visibleSizes = current ? sizes.map((type, index) => ({ type, index })).filter(row => compatibleIds.has(row.type.id)) : []
  const selectedIds = adjusting
    ? new Set(visibleSizes.filter(({ index }) => Number(form.watch(`sizes.${index}.quantity`)) > 0).map(({ type }) => type.id))
    : new Set(current?.recommendation.containers.filter(item => item.quantity > 0).map(item => item.containerDefinitionId) ?? [])
  const awaitingWorkflow = (current?.containerTypes ?? []).filter(type => selectedIds.has(type.id) && type.assemblyWorkflowReady === false)
  useEffect(() => {
    if (!current?.containerTypes) return
    const currentIds = new Set(current.containerTypes.map(type => type.id))
    sizes.forEach((type, index) => {
      const quantity = form.getValues(`sizes.${index}.quantity`)
      if (!currentIds.has(type.id) && quantity !== 0 && quantity !== '0')
        form.setValue(`sizes.${index}.quantity`, 0, { shouldDirty: true })
    })
  }, [current?.containerTypes, form, sizes])
  const isDirty = __formDraftDirty
  const close = async () => { if (!busy && (!isDirty || (await confirmPortal('Discard the unsaved kit order?')))) onClose() }
  useBlocker({ shouldBlockFn: async () => busy || isDirty && !(await confirmPortal('Discard the unsaved kit order?')), enableBeforeUnload: busy || isDirty })
  const submit = form.handleSubmit(values => {
    const containers = adjusting ? values.sizes.filter(item => compatibleIds.has(item.containerDefinitionId)).map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: Number(item.quantity) })).filter(item => item.quantity > 0) : current?.recommendation.containers.map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: item.quantity })) ?? []
    if (!containers.length) { form.setError('root', { message: 'Choose at least one kit to order.' }); return }
    if (!busy && !query.isFetching && !query.error && current?.canRequestKits && location) onConfirm({ shipmentVersion: current.shipmentVersion, deliveryLocationId: location.id, deliveryLocationVersion: location.version, containers })
  })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} showCloseButton={!busy}><DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8"><CustomerText message="m_00314a47441a" /></DialogTitle><DialogDescription className="pr-8"><CustomerText message="m_abf45bed2790" />{initial.jobNumber}<CustomerText message="m_f1d7c4c6bf74" /></DialogDescription></DialogHeader>{initial.sampleTypeName ? <p className="text-sm"><strong><CustomerText message="m_d39c8ce0cc98" /></strong> {initial.sampleTypeName}<CustomerText message="m_296861fd6a29" /></p> : null}
    <form id="transportation-kit-order" className="space-y-4" noValidate onSubmit={submit}><fieldset disabled={busy || query.isFetching || !current} className="space-y-4">
      <div className="space-y-2">
      <div className="space-y-1.5"><Label htmlFor="kit-delivery-location"><RequiredFieldName><CustomerText message="m_41da0e497336" /></RequiredFieldName></Label><NativeSelect id="kit-delivery-location" className="w-full cursor-pointer rounded-md border bg-background px-3 text-sm" aria-invalid={Boolean(form.formState.errors.deliveryLocationId)} aria-describedby={[!location && 'kit-location-help', form.formState.errors.deliveryLocationId && 'kit-location-error'].filter(Boolean).join(' ') || undefined} {...form.register('deliveryLocationId')}><option value=""><CustomerText message="m_ef7ccf54df7b" /></option>{initial.locations.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.label}{item.isDefault ? <CustomerSourceText source={" (default)"} /> : ''}</option>)}</NativeSelect>{form.formState.errors.deliveryLocationId ? <p id="kit-location-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.deliveryLocationId.message} />}</p> : null}
      {location ? <DeliveryAddress location={location} /> : <p id="kit-location-help" className="text-sm text-muted-foreground">{initial.locations.length ? <CustomerSourceText source={"Choose where Phaeno should deliver these kits."} /> : __customerText('m_19540a28dc4c')}</p>}
      </div>
      <Link to="/delivery-locations" search={{ organizationId, departmentId, shipmentId, returnOrderId, resumeKitOrder: true }} onClick={event => { if (busy) event.preventDefault() }} aria-disabled={busy} className="inline-block text-sm text-primary underline"><CustomerText message="m_1ae08c3442c9" /></Link>
      </div>
      <section aria-labelledby="kit-order-sizes-heading" className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id="kit-order-sizes-heading" className="text-sm font-medium"><CustomerText message="m_79cda409e9a4" /></h3>
      {visibleSizes.length ? <Button type="button" variant="outline" aria-expanded={adjusting} onClick={() => { form.setValue('adjustSizes', !adjusting, { shouldDirty: true }); form.clearErrors('root') }}>{adjusting ? <CustomerSourceText source={"Use recommended sizes"} /> : __customerText('m_9e5e27a362ca')}</Button> : null}
      </div>
      {visibleSizes.length && adjusting ? <div className="space-y-3">{visibleSizes.map(({ type, index }) => <div key={type.id} className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2"><Label htmlFor={`order-kit-size-${index}`} className="block self-center">{type.commonName}<span className="mt-1 block text-xs font-normal text-muted-foreground">{type.sku} <CustomerText message="m_37bdf9777d54" />{type.tubeCapacity}</span></Label><Input id={`order-kit-size-${index}`} type="number" min="0" max="10000" step="1" aria-label={__customerText('m_6047ec452f28', { p0: String(type.commonName) })} aria-invalid={Boolean(form.formState.errors.sizes?.[index]?.quantity)} {...form.register(`sizes.${index}.quantity`)} />{form.formState.errors.sizes?.[index]?.quantity ? <p role="alert" className="col-span-full text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.sizes[index]?.quantity?.message} />}</p> : null}</div>)}</div> : null}
      {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.root.message} />}</p> : null}
      {query.isFetching ? <p role="status" className="text-sm"><CustomerText message="m_a579a0ba3105" /></p> : query.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_a4eeef842ed2" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(query.error)} /> <Button type="button" variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_5342e8cf6f57" /></Button></AlertDescription></Alert> : current ? <>{!adjusting && current.recommendation.containers.length > 0 ? <div className="space-y-2"><p className="text-sm font-medium"><CustomerText message="m_45dd03b091ce" /></p><KitLines lines={current.recommendation.containers.map(item => ({ ...item, requestedQuantity: item.quantity, tubeCapacity: item.capacity }))} /></div> : null}{awaitingWorkflow.length ? <Alert variant="warning"><AlertTitle><CustomerText message="m_28c8c0517e25" /></AlertTitle><AlertDescription>{awaitingWorkflow.map(item => item.commonName).join(', ')} {awaitingWorkflow.length === 1 ? <CustomerSourceText source={"has"} /> : __customerText('m_193c45b52819')} <CustomerText message="m_70556a5abc38" /></AlertDescription></Alert> : null}{!current.canRequestKits ? <p role="status" className="text-sm text-muted-foreground">{current.requestBlockedReason}</p> : null}</> : null}
      </section>
    </fieldset></form>{error ? <Alert variant="destructive" className="min-w-0 self-stretch"><AlertTitle><CustomerText message="m_4bacf011ff6a" /></AlertTitle><AlertDescription className="min-w-0 wrap-anywhere">{kitOrderErrorMessage(error)}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}><CustomerText message="m_34411a1bde47" /></Button><Button type="submit" form="transportation-kit-order" disabled={busy || query.isFetching || Boolean(query.error) || !current?.canRequestKits || !adjusting && !current.recommendation.containerCount}>{busy ? <CustomerSourceText source={"Ordering kits…"} /> : __customerText('m_03292ad1579e')}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function kitOrderErrorMessage(error: unknown) {
  const message = apiErrorMessage(error).trim()
  return !message || /^(an unexpected error occurred|the request could not be completed|request failed with status code 5\d\d)[.!]?$/i.test(message)
    ? 'We couldn’t place your kit order. Your selections are still here. Please try again.'
    : message
}

const receiptSchema = z.object({ stockKitIds: z.array(z.string()).min(1, 'Select the kits that have arrived.') })
export function KitReceiptDialog({ request, busy, blocked = false, error, onClose, onConfirm }: { request: TransportationKitRequest; busy: boolean; blocked?: boolean; error: unknown; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const __customerText = useCustomerText()

  const form = useForm<z.infer<typeof receiptSchema>>({ resolver: zodResolver(receiptSchema), defaultValues: { stockKitIds: [] } })
  const { isDirty: __formDraftDirty } = form.formState

  const isDirty = __formDraftDirty
  const close = async () => { if (!busy && (!(isDirty || form.getValues('stockKitIds').length > 0) || (await confirmPortal('Discard the unsaved receipt selection?')))) onClose() }
  useBlocker({ shouldBlockFn: async () => busy || isDirty && !(await confirmPortal('Discard the unsaved receipt selection?')), enableBeforeUnload: busy || isDirty })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} showCloseButton={!busy}><DialogHeader><DialogTitle><CustomerText message="m_964449cbcab1" /></DialogTitle><DialogDescription><CustomerText message="m_494be6a3c4f9" /></DialogDescription></DialogHeader><form id="kit-receipt" noValidate onSubmit={form.handleSubmit(values => { if (!busy && !blocked) onConfirm(values.stockKitIds) })}><fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-sm font-medium"><RequiredFieldName><CustomerText message="m_7f8251374006" /></RequiredFieldName></legend>{request.kits.filter(item => !item.receivedAt).map(item => <label key={item.stockKitId} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"><input type="checkbox" value={item.stockKitId} className="mt-1 size-4" {...form.register('stockKitIds')} /><span><strong>{item.kitNumber}</strong><span className="block">{item.outboundCarrier} <CustomerText message="m_d5f8fccbb347" />{item.outboundTrackingNumber}</span></span></label>)}{form.formState.errors.stockKitIds ? <p role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.stockKitIds.message} />}</p> : null}</fieldset></form>{error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_01a20c68d4dd" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(error)} /></AlertDescription></Alert> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form="kit-receipt" disabled={busy || blocked}>{busy ? <CustomerSourceText source={"Saving receipt…"} /> : __customerText('m_ea28dee8af68')}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
function KitCancellationDialog({ busy, error, onClose, onConfirm }: { busy: boolean; error: unknown; onClose: () => void; onConfirm: (reason: string) => void }) {
  const __customerText = useCustomerText()

  const [reason, setReason] = useState('')
  useBlocker({ shouldBlockFn: async () => busy || Boolean(reason.trim()) && !(await confirmPortal('Discard the cancellation note?')), enableBeforeUnload: busy || Boolean(reason.trim()) })
  const close = async () => { if (!busy && (!reason.trim() || (await confirmPortal('Discard the cancellation note?')))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!busy} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}><DialogHeader><DialogTitle><CustomerText message="m_1342631c98a4" /></DialogTitle><DialogDescription><CustomerText message="m_07e7cb5a413d" /></DialogDescription></DialogHeader><div className="space-y-1.5"><Label htmlFor="kit-cancel-reason"><CustomerText message="m_0f7d4664a9bc" /></Label><Input id="kit-cancel-reason" value={reason} disabled={busy} maxLength={2000} onChange={event => setReason(event.target.value)} /></div>{error ? <Alert variant="destructive"><AlertDescription><CustomerSourceText source={apiErrorMessage(error)} /></AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={busy} onClick={close}><CustomerText message="m_f01f5324e5d1" /></Button><Button disabled={busy} onClick={() => onConfirm(reason)}>{busy ? <CustomerSourceText source={"Cancelling…"} /> : __customerText('m_bcfdc2e9952c')}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
