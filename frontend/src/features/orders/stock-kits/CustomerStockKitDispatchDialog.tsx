import { Field as PortalField } from '#/components/ui/field'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { stockKitHasFullRoster } from './stock-kit-utils'
import { getOrderErrorMessage } from '#/api/order-management'
import { dispatchShippingStockKit, type ShippingStockKit } from '#/api/shipping-containers'
import { getPlatformTransportationKitRequest, getPlatformTransportationKitRequests, resolveTransportationKitBarcode, type TransportationKitRequest } from '#/api/transportation-kit-requests'
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

const schema = z.object({ requestId: z.string().uuid('Choose the Customer kit request.'), confirmUnavailableFixedDestination: z.boolean(), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(255), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch time.') })
type Values = z.infer<typeof schema>

export function CustomerStockKitDispatchDialog({ kit, onClose, onSaved }: { kit: ShippingStockKit; onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void> }) {
  const requests = useQuery({ queryKey: ['platform-transportation-kit-requests'], queryFn: () => getPlatformTransportationKitRequests() })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { requestId: '', confirmUnavailableFixedDestination: false, outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const { isDirty: __formDraftDirty } = form.formState

  const requestId = form.watch('requestId')
  const detail = useQuery({ queryKey: ['platform-transportation-kit-request', requestId], queryFn: () => getPlatformTransportationKitRequest(requestId), enabled: Boolean(requestId) })
  const kitCheck = useQuery({ queryKey: ['platform-transportation-kit-kit-check', requestId, kit.kitNumber], queryFn: () => resolveTransportationKitBarcode(requestId, kit.kitNumber), enabled: Boolean(requestId) })
  const candidates = (requests.data ?? []).filter(request => matchingRequest(request, kit))
  const selected = detail.data?.request
  const savedDestination = detail.data?.phaenoDestinations?.find(destination =>
    destination.id === detail.data?.selectedPhaenoDestinationId && destination.isCurrentForNewWork === false)
  const selectedLine = selected?.lines.find(line => line.containerDefinitionId === kit.container.definitionId)
  const remaining = selectedLine ? selectedLine.requestedQuantity - selectedLine.dispatchedQuantity : 0
  const selectedStillOpen = candidates.some(request => request.id === requestId)
  const blocked = !selectedStillOpen ? 'This request is no longer awaiting this container size. Choose a current request.'
    : detail.data && !detail.data.canDispatch ? detail.data.dispatchBlockedReason ?? 'This request is not ready for dispatch.'
      : kitCheck.data && kitCheck.data.id !== kit.id ? 'This barcode resolved to another physical kit. Review inventory before dispatch.' : null
  const submitting = useRef(false)
  const mutation = useMutation({ mutationFn: (values: Values) => {
    if (!selected || selected.id !== values.requestId || requests.error || detail.error || kitCheck.error || detail.isFetching || kitCheck.isFetching || !kitCheck.data || blocked) throw new Error(blocked ?? 'Refresh the request and physical kit before recording dispatch.')
    return dispatchShippingStockKit(kit.id, { requestId: selected.id, deliveryLocationId: selected.deliveryLocationId, version: kit.version, outboundCarrier: values.outboundCarrier, outboundTrackingNumber: values.outboundTrackingNumber, fulfilledAt: new Date(values.fulfilledAt).toISOString(),
      ...(savedDestination ? { confirmUnavailableFixedDestination: values.confirmUnavailableFixedDestination } : {}) })
  }, onSuccess: async result => { form.reset(form.getValues()); allowNavigation(); await onSaved(result) }, onSettled: () => { submitting.current = false } })
  const dirty = __formDraftDirty, errors = form.formState.errors
  const allowNavigation = useOrderDraftGuard(dirty, mutation.isPending)
  async function close() { if (!submitting.current && (!dirty || (await confirmPortal('Discard the unsaved kit-dispatch details?')))) onClose() }
  function submit(values: Values) {
    if (savedDestination && !values.confirmUnavailableFixedDestination) {
      form.setError('confirmUnavailableFixedDestination', { type: 'required', message: 'Confirm that receiving can accept the remaining kits at this saved destination.' })
      return
    }
    if (!submitting.current) { submitting.current = true; mutation.mutate(values) }
  }
  function input(name: 'outboundCarrier' | 'outboundTrackingNumber' | 'fulfilledAt', label: string, type = 'text') {
    return <PortalField className="min-w-0"><Label htmlFor={`customer-dispatch-${name}`}><RequiredFieldName>{label}</RequiredFieldName></Label><Input id={`customer-dispatch-${name}`} type={type} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `customer-dispatch-${name}-error` : undefined} {...form.register(name)} />{errors[name] ? <p id={`customer-dispatch-${name}-error`} role="alert" className="text-xs text-destructive">{<CustomerSourceText source={errors[name].message} />}</p> : null}</PortalField>
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl" showCloseButton={!mutation.isPending}>
    <DialogHeader><DialogTitle><CustomerSourceText source={"Record Customer kit dispatch"} /></DialogTitle><DialogDescription>{kit.kitNumber} · {kit.container.commonName}<CustomerSourceText source={". Send this physical kit to the request's saved delivery location."} /></DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Dispatch was not recorded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Your entries are retained. Review the request and try again.')} />}</AlertDescription></Alert> : null}
    {requests.error || detail.error || kitCheck.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Kit request could not be checked"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(requests.error ?? detail.error ?? kitCheck.error, 'Your entries are retained. Refresh before dispatch.')} />} <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { void requests.refetch(); if (requestId) { void detail.refetch(); void kitCheck.refetch() } }}><CustomerSourceText source={"Retry request check"} /></Button></AlertDescription></Alert> : null}
    <form id="customer-stock-kit-dispatch" className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
      <PortalField ><Label htmlFor="customer-dispatch-request"><RequiredFieldName><CustomerSourceText source={"Kit request"} /></RequiredFieldName></Label><NativeSelect id="customer-dispatch-request" className="w-full" disabled={mutation.isPending || requests.isPending} aria-invalid={Boolean(errors.requestId)} aria-describedby={errors.requestId ? 'customer-dispatch-request-error' : undefined} {...form.register('requestId', { onChange: () => { form.setValue('confirmUnavailableFixedDestination', false); form.clearErrors('confirmUnavailableFixedDestination') } })}>
        <option value=""><CustomerSourceText source={"Select a kit request"} /></option>{candidates.map(request => <option key={request.id} value={request.id}>{kitRequestReference(request)} · {request.organizationName} · {request.deliveryAddress.label}</option>)}
        {requestId && !selectedStillOpen ? <option value={requestId} disabled><CustomerSourceText source={"Previously selected request — unavailable"} /></option> : null}
      </NativeSelect>{errors.requestId ? <p id="customer-dispatch-request-error" role="alert" className="text-xs text-destructive">{<CustomerSourceText source={errors.requestId.message} />}</p> : null}</PortalField>
      {requests.isPending ? <p role="status" className="text-sm"><CustomerSourceText source={"Loading kit requests…"} /></p> : !candidates.length && !requests.error ? <p className="text-sm text-muted-foreground"><CustomerSourceText source={"No open Customer request needs this container size. Review Kit requests before recording dispatch."} /></p> : null}
      {requestId && detail.isPending ? <p role="status" className="text-sm"><CustomerSourceText source={"Checking the requested kits and delivery address…"} /></p> : null}
      {selected ? <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm"><div><p className="font-semibold"><CustomerSourceText source={"Deliver to"} /> {selected.deliveryAddress.label}</p><p className="mt-1 wrap-anywhere">{selected.organizationName} · {selected.departmentName}</p></div><DeliveryLocationAddress location={selected.deliveryAddress} /><p className="wrap-anywhere text-xs text-muted-foreground"><CustomerSourceText source={"Originating Job"} /> {selected.jobNumber}<CustomerSourceText source={". Received unused stock is available at this location for eligible Jobs."} /></p>{selectedLine ? <p>{remaining} {remaining === 1 ? <CustomerSourceText source={"kit"} /> : <CustomerSourceText source={"kits"} />} <CustomerSourceText source={"still needed in this size; this dispatch sends 1."} /></p> : null}</div> : null}
      {savedDestination ? <div className="space-y-2"><Alert><AlertTitle><CustomerSourceText source={"Saved destination no longer active"} /></AlertTitle><AlertDescription><CustomerSourceText source={"The first kit fixed this Job to"} /> {savedDestination.name} <CustomerSourceText source={"· revision"} /> {savedDestination.revision}<CustomerSourceText source={". Confirm that receiving can accept the remaining kits here. A new Default does not redirect this Job."} /></AlertDescription></Alert><label className="flex cursor-pointer items-start gap-2 text-sm"><NativeCheckbox  className="accent-primary" disabled={mutation.isPending} aria-invalid={Boolean(errors.confirmUnavailableFixedDestination)} aria-describedby={errors.confirmUnavailableFixedDestination ? 'stock-confirm-destination-error' : undefined} {...form.register('confirmUnavailableFixedDestination')} /><RequiredFieldName><CustomerSourceText source={"Receiving can accept the remaining kits at this saved destination"} /></RequiredFieldName></label>{errors.confirmUnavailableFixedDestination ? <p id="stock-confirm-destination-error" role="alert" className="text-xs text-destructive">{<CustomerSourceText source={errors.confirmUnavailableFixedDestination.message} />}</p> : null}</div> : null}
      {requestId && blocked && !detail.isPending ? <p role="alert" className="text-sm text-destructive">{blocked}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{input('outboundCarrier', 'Carrier')}{input('outboundTrackingNumber', 'Tracking number')}</div>{input('fulfilledAt', 'Dispatched at', 'datetime-local')}
      <p className="text-xs text-muted-foreground"><CustomerSourceText source={"This updates the request and places the kit On the way. Availability begins after Customer receipt."} /></p>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="customer-stock-kit-dispatch" disabled={mutation.isPending || kit.status !== 'Preparing' || !kit.assemblyCompletedAt || !stockKitHasFullRoster(kit) || Boolean(requests.error || detail.error || kitCheck.error) || Boolean(requestId && (detail.isFetching || kitCheck.isFetching || !kitCheck.data || blocked))}>{mutation.isPending ? <CustomerSourceText source={"Recording…"} /> : <CustomerSourceText source={"Record dispatch"} />}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function matchingRequest(request: TransportationKitRequest, kit: ShippingStockKit) {
  return ['Pending', 'PartiallyDispatched'].includes(request.status) && request.lines.some(line => line.containerDefinitionId === kit.container.definitionId && line.dispatchedQuantity < line.requestedQuantity)
}
