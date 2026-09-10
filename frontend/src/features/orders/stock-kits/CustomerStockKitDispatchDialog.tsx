import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import { dispatchShippingStockKit, type ShippingStockKit } from '#/api/shipping-containers'
import { getPlatformTransportationKitRequest, getPlatformTransportationKitRequests, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { localContainerDateTime } from '../configuration/shipping-container-utils'
import { kitRequestReference } from '../kit-requests/kit-request-navigation'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const schema = z.object({ requestId: z.string().uuid('Choose the Customer kit request.'), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(255), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch time.') })
type Values = z.infer<typeof schema>

export function CustomerStockKitDispatchDialog({ kit, onClose, onSaved }: { kit: ShippingStockKit; onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void> }) {
  const requests = useQuery({ queryKey: ['platform-transportation-kit-requests'], queryFn: () => getPlatformTransportationKitRequests() })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { requestId: '', outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const requestId = form.watch('requestId')
  const detail = useQuery({ queryKey: ['platform-transportation-kit-request', requestId], queryFn: () => getPlatformTransportationKitRequest(requestId), enabled: Boolean(requestId) })
  const candidates = (requests.data ?? []).filter(request => matchingRequest(request, kit))
  const selected = detail.data?.request
  const selectedLine = selected?.lines.find(line => line.containerDefinitionId === kit.container.definitionId)
  const remaining = selectedLine ? selectedLine.requestedQuantity - selectedLine.dispatchedQuantity : 0
  const selectedStillOpen = candidates.some(request => request.id === requestId)
  const blocked = !selectedStillOpen ? 'This request is no longer awaiting this container size. Choose a current request.'
    : detail.data && !detail.data.canDispatch ? detail.data.dispatchBlockedReason ?? 'This request is not ready for dispatch.'
      : detail.data && !detail.data.availableStockKits.some(value => value.id === kit.id) ? 'This physical kit is not available for the selected request. Review the kit and requested size.' : null
  const submitting = useRef(false)
  const mutation = useMutation({ mutationFn: (values: Values) => {
    if (!selected || selected.id !== values.requestId || requests.error || detail.error || detail.isFetching || blocked) throw new Error(blocked ?? 'Refresh the request before recording dispatch.')
    return dispatchShippingStockKit(kit.id, { requestId: selected.id, deliveryLocationId: selected.deliveryLocationId, version: kit.version, outboundCarrier: values.outboundCarrier, outboundTrackingNumber: values.outboundTrackingNumber, fulfilledAt: new Date(values.fulfilledAt).toISOString() })
  }, onSuccess: async result => { form.reset(form.getValues()); allowNavigation(); await onSaved(result) }, onSettled: () => { submitting.current = false } })
  const dirty = form.formState.isDirty, errors = form.formState.errors
  const allowNavigation = useOrderDraftGuard(dirty, mutation.isPending)
  function close() { if (!submitting.current && (!dirty || window.confirm('Discard the unsaved kit-dispatch details?'))) onClose() }
  function submit(values: Values) { if (!submitting.current) { submitting.current = true; mutation.mutate(values) } }
  function input(name: 'outboundCarrier' | 'outboundTrackingNumber' | 'fulfilledAt', label: string, type = 'text') {
    return <div className="min-w-0 space-y-2"><Label htmlFor={`customer-dispatch-${name}`}><RequiredFieldName>{label}</RequiredFieldName></Label><Input id={`customer-dispatch-${name}`} type={type} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `customer-dispatch-${name}-error` : undefined} {...form.register(name)} />{errors[name] ? <p id={`customer-dispatch-${name}-error`} role="alert" className="text-xs text-destructive">{errors[name].message}</p> : null}</div>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl" showCloseButton={!mutation.isPending}>
    <DialogHeader><DialogTitle>Record Customer kit dispatch</DialogTitle><DialogDescription>{kit.kitNumber} · {kit.container.commonName}. Send this physical kit to the request's saved delivery location.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Dispatch was not recorded</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Your entries are retained. Review the request and try again.')}</AlertDescription></Alert> : null}
    {requests.error || detail.error ? <Alert variant="destructive"><AlertTitle>Kit request could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(requests.error ?? detail.error, 'Your entries are retained. Refresh before dispatch.')} <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { void requests.refetch(); if (requestId) void detail.refetch() }}>Retry request check</Button></AlertDescription></Alert> : null}
    <form id="customer-stock-kit-dispatch" className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
      <div className="space-y-2"><Label htmlFor="customer-dispatch-request"><RequiredFieldName>Kit request</RequiredFieldName></Label><select id="customer-dispatch-request" className="h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" disabled={mutation.isPending || requests.isPending} aria-invalid={Boolean(errors.requestId)} aria-describedby={errors.requestId ? 'customer-dispatch-request-error' : undefined} {...form.register('requestId')}>
        <option value="">Select a kit request</option>{candidates.map(request => <option key={request.id} value={request.id}>{kitRequestReference(request)} · {request.organizationName} · {request.deliveryAddress.label}</option>)}
        {requestId && !selectedStillOpen ? <option value={requestId} disabled>Previously selected request — unavailable</option> : null}
      </select>{errors.requestId ? <p id="customer-dispatch-request-error" role="alert" className="text-xs text-destructive">{errors.requestId.message}</p> : null}</div>
      {requests.isPending ? <p role="status" className="text-sm">Loading kit requests…</p> : !candidates.length && !requests.error ? <p className="text-sm text-muted-foreground">No open Customer request needs this container size. Review Kit requests before recording dispatch.</p> : null}
      {requestId && detail.isPending ? <p role="status" className="text-sm">Checking the requested kits and delivery address…</p> : null}
      {selected ? <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm"><div><p className="font-semibold">Deliver to {selected.deliveryAddress.label}</p><p className="mt-1 wrap-anywhere">{selected.organizationName} · {selected.departmentName}</p></div><DeliveryLocationAddress location={selected.deliveryAddress} /><p className="wrap-anywhere text-xs text-muted-foreground">Originating Job {selected.jobNumber}. Received unused stock is available at this location for eligible Jobs.</p>{selectedLine ? <p>{remaining} {remaining === 1 ? 'kit' : 'kits'} still needed in this size; this dispatch sends 1.</p> : null}</div> : null}
      {requestId && blocked && !detail.isPending ? <p role="alert" className="text-sm text-destructive">{blocked}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{input('outboundCarrier', 'Carrier')}{input('outboundTrackingNumber', 'Tracking number')}</div>{input('fulfilledAt', 'Dispatched at', 'datetime-local')}
      <p className="text-xs text-muted-foreground">This updates the request and places the kit On the way. Availability begins after Customer receipt.</p>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="customer-stock-kit-dispatch" disabled={mutation.isPending || kit.status !== 'Preparing' || kit.tubes.length !== kit.container.capacity || Boolean(requests.error || detail.error) || Boolean(requestId && (detail.isFetching || blocked))}>{mutation.isPending ? 'Recording…' : 'Record dispatch'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function matchingRequest(request: TransportationKitRequest, kit: ShippingStockKit) {
  return ['Pending', 'PartiallyDispatched'].includes(request.status) && request.lines.some(line => line.containerDefinitionId === kit.container.definitionId && line.dispatchedQuantity < line.requestedQuantity)
}
