import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import { PackageCheck, Truck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import type { CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import { apiErrorMessage } from '#/api/organization-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import { cancelTransportationKitRequest, confirmTransportationKitsReceived, getShipmentKitSupply, orderTransportationKits, type ShipmentKitSupply, type TransportationKitOrderInput, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

export function TransportationKitsPanel({ shipment, canManage, deliveryLocationId, autoOpenOrder = false, children }: { shipment: SampleShipmentWorkflow; canManage: boolean; deliveryLocationId?: string; autoOpenOrder?: boolean; children?: ReactNode }) {
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
    ])
  }
  const keyFor = (kind: string, payload: unknown) => { const signature = JSON.stringify([kind, payload]); const key = operationKeys.get(signature) ?? crypto.randomUUID(); operationKeys.set(signature, key); return key }
  const order = useMutation({ mutationFn: (input: TransportationKitOrderInput) => orderTransportationKits(shipment.id, input, keyFor('order', input)), onSuccess: refresh })
  const receive = useMutation({ mutationFn: (stockKitIds: string[]) => confirmTransportationKitsReceived(requestSnapshot!.id, { version: operationVersion, stockKitIds }, keyFor('receive', stockKitIds)), onSuccess: refresh })
  const cancel = useMutation({ mutationFn: (reason: string) => cancelTransportationKitRequest(requestSnapshot!.id, { version: operationVersion, reason: reason.trim() || undefined }, keyFor('cancel', reason.trim())), onSuccess: refresh })
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
    {showKitCard ? <Card><CardHeader><CardTitle>{shipment.isPackingPool ? 'Transportation kits' : 'Kit delivery'}</CardTitle>{shipment.isPackingPool ? <CardDescription>Transportation kits and outbound delivery are included. No additional charge.</CardDescription> : null}</CardHeader><CardContent className="space-y-4">
      {supply.isPending ? <p role="status">Checking transportation kits…</p> : supply.error || !supply.data ? <Alert variant="destructive"><AlertTitle>Kit information unavailable</AlertTitle><AlertDescription>{apiErrorMessage(supply.error)} <Button variant="outline" onClick={() => void supply.refetch()}>Retry kit information</Button></AlertDescription></Alert> : <>
        {activeRequest ? <KitRequestSummary request={activeRequest} /> : null}
        {showOrderOptions ? <>
          {activeRequest?.status === 'Received' ? <p className="font-medium">Additional kits for the remaining tubes</p> : null}
          {request?.status === 'Cancelled' ? <p role="status" className="font-medium">Kit order cancelled.</p> : null}
          <p className="text-sm">{available > 0 ? `${available} received ${available === 1 ? 'kit is' : 'kits are'} available at this location.` : 'No compatible received kits are currently available at this location. Order the recommended sizes if you need supplies.'}</p>
          <KitLines lines={supply.data.recommendation.containers.map(item => ({ ...item, requestedQuantity: item.quantity, tubeCapacity: item.capacity }))} />
          {canManage ? <><Button disabled={!supply.data.canRequestKits} onClick={() => open('order')}><Truck data-icon="inline-start" />Order transportation kits</Button>{!supply.data.canRequestKits ? <p className="text-sm text-muted-foreground">{supply.data.requestBlockedReason}</p> : null}{!supply.data.locations.length ? <p><Link to="/delivery-locations" search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId: shipment.id }} className="text-sm text-primary underline">Add a delivery location</Link></p> : null}</> : <p className="text-sm text-muted-foreground">An organization or Department administrator can order transportation kits.</p>}
        </> : null}
        {canManage && activeRequest?.canConfirmReceipt ? <Button onClick={() => open('receive')}><PackageCheck data-icon="inline-start" />Confirm kits received</Button> : null}
        {canManage && activeRequest?.canCancel ? <Button variant="outline" onClick={() => open('cancel')}>Cancel kit order</Button> : null}
        {supply.data.deliveryLocationId ? <p><Link to="/delivery-locations/$locationId" params={{ locationId: supply.data.deliveryLocationId }} search={{ organizationId: shipment.organizationId, departmentId: selectedDepartmentId ?? '', shipmentId: shipment.id }} className="text-sm text-primary underline">View location inventory and deliveries</Link></p> : null}
        {!canPrepare && !showOrderOptions && supply.data.preparationBlockedReason ? <p className="text-sm text-muted-foreground">{supply.data.preparationBlockedReason}</p> : null}
      </>}
    </CardContent></Card> : null}
    {children}
    {action === 'order' && supply.data && canManage && supply.data.locations.length > 0 ? <TransportationKitOrderDialog shipmentId={shipment.id} organizationId={shipment.organizationId} departmentId={selectedDepartmentId ?? ''} initial={supply.data} busy={order.isPending} error={order.error} onClose={() => setAction(null)} onConfirm={input => order.mutate(input)} /> : null}
    {action === 'receive' && requestSnapshot ? <KitReceiptDialog request={requestSnapshot} busy={receive.isPending} blocked={supply.isFetching || Boolean(supply.error)} error={receive.error} onClose={() => setAction(null)} onConfirm={ids => receive.mutate(ids)} /> : null}
    {action === 'cancel' && requestSnapshot ? <KitCancellationDialog busy={cancel.isPending} error={cancel.error} onClose={() => setAction(null)} onConfirm={reason => { if (!supply.isFetching && !supply.error) cancel.mutate(reason) }} /> : null}
  </div>
}

function KitLines({ lines }: { lines: Array<{ containerDefinitionId: string; sku: string; commonName: string; tubeCapacity: number; requestedQuantity: number }> }) {
  return <ul className="space-y-2 text-sm">{lines.map(item => <li key={item.containerDefinitionId} className="flex items-start justify-between gap-3 rounded-md border p-3"><div><p className="font-medium">{item.commonName}</p><p className="text-xs text-muted-foreground">SKU {item.sku} · {item.tubeCapacity} tubes per kit</p></div><span className="whitespace-nowrap">{item.requestedQuantity} {item.requestedQuantity === 1 ? 'kit' : 'kits'}</span></li>)}</ul>
}
function KitRequestSummary({ request }: { request: TransportationKitRequest }) {
  return <div className="space-y-3"><p role="status" className="font-medium">{request.status === 'Pending' ? 'Kits ordered' : request.status === 'PartiallyDispatched' ? 'Some kits are on the way' : request.status === 'Dispatched' ? 'Kits on the way' : 'Kits received'}</p><KitLines lines={request.lines} /><DeliveryAddress location={request.deliveryAddress} /><ul className="space-y-2 text-sm">{request.kits.map(kit => <li key={kit.stockKitId} className="rounded-md border p-3"><p className="font-medium">{kit.kitNumber} · {kit.receivedAt ? 'Received' : 'On the way'}</p><p>{kit.outboundCarrier} · Tracking {kit.outboundTrackingNumber}</p></li>)}</ul>{request.status === 'Pending' ? <p className="text-sm text-muted-foreground">Phaeno will prepare these kits. Carrier and tracking details will appear here after dispatch.</p> : null}</div>
}
function DeliveryAddress({ location }: { location: CustomerDeliveryLocation }) { return <address className="rounded-md bg-muted/40 p-3 text-sm not-italic"><p className="font-medium">{location.label}</p><p>{location.recipient}</p><p>{location.line1}{location.line2 ? `, ${location.line2}` : ''}</p><p>{location.city}, {location.region} {location.postalCode} · {location.countryCode}</p>{location.deliveryInstructions ? <p className="mt-2">{location.deliveryInstructions}</p> : null}</address> }

const locationSchema = z.object({ deliveryLocationId: z.string().min(1, 'Select a delivery location.'), adjustSizes: z.boolean(), sizes: z.array(z.object({ containerDefinitionId: z.string(), quantity: z.unknown() })) }).superRefine((values, context) => {
  if (!values.adjustSizes) return
  values.sizes.forEach((row, index) => { const quantity = Number(row.quantity); if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000 || row.quantity === '') context.addIssue({ code: 'custom', path: ['sizes', index, 'quantity'], message: 'Enter a whole number of kits from 0 to 10,000.' }) })
})
export function TransportationKitOrderDialog({ shipmentId, organizationId, departmentId, initial, busy, error, onClose, onConfirm }: { shipmentId: string; organizationId: string; departmentId: string; initial: ShipmentKitSupply; busy: boolean; error: unknown; onClose: () => void; onConfirm: (input: TransportationKitOrderInput) => void }) {
  const [sizes] = useState(() => initial.containerTypes ?? [])
  const form = useForm<z.input<typeof locationSchema>, unknown, z.output<typeof locationSchema>>({ resolver: zodResolver(locationSchema), defaultValues: { deliveryLocationId: initial.deliveryLocationId ?? '', adjustSizes: false, sizes: sizes.map(type => ({ containerDefinitionId: type.id, quantity: initial.recommendation.containers.find(item => item.containerDefinitionId === type.id)?.quantity ?? 0 })) } })
  const adjusting = useWatch({ control: form.control, name: 'adjustSizes' })
  const locationId = useWatch({ control: form.control, name: 'deliveryLocationId' })
  const location = initial.locations.find(item => item.id === locationId && item.isActive)
  const query = useQuery({ queryKey: ['transportation-kit-order-preview', shipmentId, locationId], queryFn: () => getShipmentKitSupply(shipmentId, locationId), enabled: Boolean(locationId), initialData: locationId === initial.deliveryLocationId ? initial : undefined, staleTime: 0 })
  const current = query.data ?? (!locationId ? initial : undefined)
  const isDirty = form.formState.isDirty
  const close = () => { if (!busy && (!isDirty || window.confirm('Discard the unsaved kit order?'))) onClose() }
  useBlocker({ shouldBlockFn: () => busy || isDirty && !window.confirm('Discard the unsaved kit order?'), enableBeforeUnload: busy || isDirty })
  const submit = form.handleSubmit(values => {
    const containers = adjusting ? values.sizes.map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: Number(item.quantity) })).filter(item => item.quantity > 0) : current?.recommendation.containers.map(item => ({ containerDefinitionId: item.containerDefinitionId, quantity: item.quantity })) ?? []
    if (!containers.length) { form.setError('root', { message: 'Choose at least one kit to order.' }); return }
    if (!busy && !query.isFetching && !query.error && current?.canRequestKits && location) onConfirm({ shipmentVersion: current.shipmentVersion, deliveryLocationId: location.id, deliveryLocationVersion: location.version, containers })
  })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} showCloseButton={!busy}><DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">Order transportation kits</DialogTitle><DialogDescription className="pr-8">Review the kits and delivery location for {initial.jobNumber}. Transportation kits and outbound delivery are included, with no additional charge.</DialogDescription></DialogHeader>
    <form id="transportation-kit-order" className="space-y-4" noValidate onSubmit={submit}><fieldset disabled={busy} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="kit-delivery-location"><RequiredFieldName>Delivery location</RequiredFieldName></Label><select id="kit-delivery-location" className="h-9 w-full cursor-pointer rounded-md border bg-background px-3 text-sm" aria-invalid={Boolean(form.formState.errors.deliveryLocationId)} aria-describedby="kit-location-error" {...form.register('deliveryLocationId')}><option value="">Select a delivery location</option>{initial.locations.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.label}{item.isDefault ? ' (default)' : ''}</option>)}</select>{form.formState.errors.deliveryLocationId ? <p id="kit-location-error" role="alert" className="text-sm text-destructive">{form.formState.errors.deliveryLocationId.message}</p> : null}</div>
      {location ? <DeliveryAddress location={location} /> : <p className="text-sm text-muted-foreground">{initial.locations.length ? 'Choose where Phaeno should deliver these kits.' : 'Add a delivery location before ordering kits.'}</p>}
      <Link to="/delivery-locations" search={{ organizationId, departmentId, shipmentId }} onClick={event => { if (busy) event.preventDefault() }} aria-disabled={busy} className="text-sm text-primary underline">Manage delivery locations</Link>
      {sizes.length ? <div className="space-y-3"><Button type="button" variant="outline" aria-expanded={adjusting} onClick={() => { form.setValue('adjustSizes', !adjusting, { shouldDirty: true }); form.clearErrors('root') }}>{adjusting ? 'Use recommended sizes' : 'Adjust kit sizes'}</Button>{adjusting ? <div className="space-y-3">{sizes.map((type, index) => <div key={type.id} className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2"><Label htmlFor={`order-kit-size-${index}`} className="block self-center">{type.commonName}<span className="mt-1 block text-xs font-normal text-muted-foreground">{type.sku} · Capacity {type.tubeCapacity}</span></Label><Input id={`order-kit-size-${index}`} type="number" min="0" max="10000" step="1" aria-label={`Quantity of ${type.commonName}`} aria-invalid={Boolean(form.formState.errors.sizes?.[index]?.quantity)} {...form.register(`sizes.${index}.quantity`)} />{form.formState.errors.sizes?.[index]?.quantity ? <p role="alert" className="col-span-full text-sm text-destructive">{form.formState.errors.sizes[index]?.quantity?.message}</p> : null}</div>)}</div> : null}</div> : null}
      {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p> : null}
      {query.isFetching ? <p role="status" className="text-sm">Checking kits for this location…</p> : query.error ? <Alert variant="destructive"><AlertTitle>Kit recommendation unavailable</AlertTitle><AlertDescription>{apiErrorMessage(query.error)} <Button type="button" variant="outline" onClick={() => void query.refetch()}>Retry recommendation</Button></AlertDescription></Alert> : current ? <>{!adjusting ? <KitLines lines={current.recommendation.containers.map(item => ({ ...item, requestedQuantity: item.quantity, tubeCapacity: item.capacity }))} /> : null}{!current.canRequestKits ? <p role="status" className="text-sm text-muted-foreground">{current.requestBlockedReason}</p> : null}</> : null}
    </fieldset></form>{error ? <Alert variant="destructive" className="min-w-0 self-stretch"><AlertTitle>Kit order could not be saved</AlertTitle><AlertDescription className="min-w-0 wrap-anywhere">{kitOrderErrorMessage(error)}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Keep reviewing</Button><Button type="submit" form="transportation-kit-order" disabled={busy || query.isFetching || Boolean(query.error) || !current?.canRequestKits || !adjusting && !current.recommendation.containerCount}>{busy ? 'Ordering kits…' : 'Confirm kit order'}</Button></RequiredDialogFooter>
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
  const form = useForm<z.infer<typeof receiptSchema>>({ resolver: zodResolver(receiptSchema), defaultValues: { stockKitIds: [] } })
  const isDirty = form.formState.isDirty
  const close = () => { if (!busy && (!(isDirty || form.getValues('stockKitIds').length > 0) || window.confirm('Discard the unsaved receipt selection?'))) onClose() }
  useBlocker({ shouldBlockFn: () => busy || isDirty && !window.confirm('Discard the unsaved receipt selection?'), enableBeforeUnload: busy || isDirty })
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault() }} showCloseButton={!busy}><DialogHeader><DialogTitle>Confirm kits received</DialogTitle><DialogDescription>Select only the kits that have physically arrived. Each confirmed kit becomes available for sample preparation.</DialogDescription></DialogHeader><form id="kit-receipt" noValidate onSubmit={form.handleSubmit(values => { if (!busy && !blocked) onConfirm(values.stockKitIds) })}><fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-sm font-medium"><RequiredFieldName>Received kits</RequiredFieldName></legend>{request.kits.filter(item => !item.receivedAt).map(item => <label key={item.stockKitId} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"><input type="checkbox" value={item.stockKitId} className="mt-1 size-4" {...form.register('stockKitIds')} /><span><strong>{item.kitNumber}</strong><span className="block">{item.outboundCarrier} · Tracking {item.outboundTrackingNumber}</span></span></label>)}{form.formState.errors.stockKitIds ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.stockKitIds.message}</p> : null}</fieldset></form>{error ? <Alert variant="destructive"><AlertTitle>Receipt could not be saved</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form="kit-receipt" disabled={busy || blocked}>{busy ? 'Saving receipt…' : 'Confirm received kits'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
function KitCancellationDialog({ busy, error, onClose, onConfirm }: { busy: boolean; error: unknown; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  useBlocker({ shouldBlockFn: () => busy || Boolean(reason.trim()) && !window.confirm('Discard the cancellation note?'), enableBeforeUnload: busy || Boolean(reason.trim()) })
  const close = () => { if (!busy && (!reason.trim() || window.confirm('Discard the cancellation note?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!busy} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}><DialogHeader><DialogTitle>Cancel kit order?</DialogTitle><DialogDescription>This cancels the transportation kit request. The Lab Job and sample list stay open.</DialogDescription></DialogHeader><div className="space-y-1.5"><Label htmlFor="kit-cancel-reason">Reason (optional)</Label><Input id="kit-cancel-reason" value={reason} disabled={busy} maxLength={2000} onChange={event => setReason(event.target.value)} /></div>{error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={busy} onClick={close}>Keep kit order</Button><Button disabled={busy} onClick={() => onConfirm(reason)}>{busy ? 'Cancelling…' : 'Cancel kit order'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}
