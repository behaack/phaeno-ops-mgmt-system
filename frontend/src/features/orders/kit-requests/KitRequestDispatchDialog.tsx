import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { dispatchTransportationKitRequest, type TransportationKitRequestDetail } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { DeliveryLocationAddress } from '#/features/organizations/delivery-locations/DeliveryLocationAddress'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { localContainerDateTime } from '../configuration/shipping-container-utils'

const baseSchema = z.object({ phaenoDestinationId: z.string().optional(), confirmUnavailableFixedDestination: z.boolean(), stockKitIds: z.array(z.string()).min(1, 'Select at least one physical kit to dispatch.'), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(100), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch date and time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch date and time.') })
type Values = z.infer<typeof baseSchema>

export function KitRequestDispatchDialog({ detail, refreshError, onRetryRefresh, onClose, onSaved }: { detail: TransportationKitRequestDetail; refreshError?: unknown; onRetryRefresh?: () => void; onClose: () => void; onSaved: (value: TransportationKitRequestDetail) => void | Promise<void> }) {
  const { request, availableStockKits } = detail
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const schema = baseSchema.superRefine((values, context) => {
    if (detail.phaenoDestinations?.length && !detail.phaenoDestinations.some(destination => destination.id === values.phaenoDestinationId)) context.addIssue({ code: 'custom', path: ['phaenoDestinationId'], message: 'Choose an available Phaeno ship-to destination.' })
    if (detail.phaenoDestinations?.some(destination => destination.id === values.phaenoDestinationId && destination.isCurrentForNewWork === false)
      && !values.confirmUnavailableFixedDestination) context.addIssue({ code: 'custom', path: ['confirmUnavailableFixedDestination'], message: 'Confirm that receiving can accept the remaining kits at this saved destination.' })
    if (values.stockKitIds.some(id => !availableStockKits.some(kit => kit.id === id))) context.addIssue({ code: 'custom', path: ['stockKitIds'], message: 'A selected kit is no longer available. Reopen Record kit shipment to review the current stock.' })
    for (const line of request.lines) {
      const count = values.stockKitIds.filter(id => availableStockKits.some(kit => kit.id === id && kit.containerDefinitionId === line.containerDefinitionId)).length
      if (count > line.requestedQuantity - line.dispatchedQuantity) context.addIssue({ code: 'custom', path: ['stockKitIds'], message: `Select no more than ${line.requestedQuantity - line.dispatchedQuantity} remaining ${line.commonName} kits.` })
    }
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { phaenoDestinationId: detail.selectedPhaenoDestinationId ?? detail.phaenoDestinations?.[0]?.id, confirmUnavailableFixedDestination: false, stockKitIds: [], outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const selected = form.watch('stockKitIds')
  const savedDestination = detail.phaenoDestinations?.find(destination => destination.id === form.watch('phaenoDestinationId') && destination.isCurrentForNewWork === false)
  const mutation = useMutation({ mutationFn: (values: Values) => {
    if (refreshError) throw new Error('Refresh the request before recording dispatch. Your entries are retained.')
    if (!detail.canDispatch) throw new Error(detail.dispatchBlockedReason ?? 'This request is not ready for dispatch.')
    const input = { ...values, stockKitIds: [...values.stockKitIds].sort(), fulfilledAt: new Date(values.fulfilledAt).toISOString(), version: request.version }
    const fingerprint = JSON.stringify(input)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    return dispatchTransportationKitRequest(request.id, input, attempt.current.key)
  }, onSuccess: async result => { form.reset(form.getValues()); allowNavigation(); await onSaved(result) } })
  const dirty = form.formState.isDirty, allowNavigation = useOrderDraftGuard(dirty, mutation.isPending), errors = form.formState.errors
  function close() { if (!mutation.isPending && (!dirty || window.confirm('Discard the unsaved kit-dispatch details?'))) onClose() }
  function input(name: 'outboundCarrier' | 'outboundTrackingNumber' | 'fulfilledAt', label: string, type = 'text') { return <DispatchField id={`request-${name}`} label={label} error={errors[name]?.message}><Input id={`request-${name}`} type={type} disabled={mutation.isPending} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `request-${name}-error` : undefined} {...form.register(name)} /></DispatchField> }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Record kit shipment</DialogTitle><DialogDescription>{request.organizationName} · {request.departmentName}. Select the registered physical kits being delivered to {request.deliveryAddress.label}.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Dispatch was not recorded</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the kits and try again.')}</AlertDescription></Alert> : null}
    {refreshError ? <Alert variant="destructive"><AlertTitle>Request refresh failed</AlertTitle><AlertDescription>Your entries are retained. Refresh the request before recording dispatch. {onRetryRefresh ? <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={onRetryRefresh}>Retry request check</Button> : null}</AlertDescription></Alert> : null}
    <form id="kit-request-dispatch" className="space-y-4" onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
      <div className="rounded-md border bg-muted/30 p-3"><p className="mb-2 text-sm font-semibold">Deliver to {request.deliveryAddress.label}</p><DeliveryLocationAddress location={request.deliveryAddress} /><p className="mt-3 text-xs text-muted-foreground">Originating Job {request.jobNumber}. Unused received kits can serve eligible Jobs at this location.</p></div>
      {detail.phaenoDestinations?.length ? <div className="space-y-2"><Label htmlFor="request-phaeno-destination"><RequiredFieldName>Phaeno ship-to destination</RequiredFieldName></Label><select id="request-phaeno-destination" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" disabled={mutation.isPending || request.kits.length > 0} aria-invalid={Boolean(errors.phaenoDestinationId)} aria-describedby={errors.phaenoDestinationId ? 'request-phaeno-destination-error' : 'request-phaeno-destination-help'} {...form.register('phaenoDestinationId')}><option value="">Select destination</option>{detail.phaenoDestinations.map(destination => <option key={destination.id} value={destination.id}>{destination.name} · revision {destination.revision}{destination.isCurrentForNewWork === false ? ' (saved route; inactive)' : ''}</option>)}</select><p id="request-phaeno-destination-help" className="text-xs text-muted-foreground">Customer samples return here. This is separate from the delivery location above. The destination is fixed after the first kit is sent.</p>{errors.phaenoDestinationId ? <p id="request-phaeno-destination-error" role="alert" className="text-xs text-destructive">{errors.phaenoDestinationId.message}</p> : null}</div> : null}
      {savedDestination ? <div className="space-y-2"><Alert><AlertTitle>Saved destination no longer active</AlertTitle><AlertDescription>The first kit fixed this Job to {savedDestination.name} · revision {savedDestination.revision}. Confirm that receiving can accept the remaining kits here. A new Default does not redirect this Job.</AlertDescription></Alert><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" disabled={mutation.isPending} aria-invalid={Boolean(errors.confirmUnavailableFixedDestination)} aria-describedby={errors.confirmUnavailableFixedDestination ? 'request-confirm-destination-error' : undefined} {...form.register('confirmUnavailableFixedDestination')} /><RequiredFieldName>Receiving can accept the remaining kits at this saved destination</RequiredFieldName></label>{errors.confirmUnavailableFixedDestination ? <p id="request-confirm-destination-error" role="alert" className="text-xs text-destructive">{errors.confirmUnavailableFixedDestination.message}</p> : null}</div> : null}
      <fieldset className="space-y-3" aria-describedby={errors.stockKitIds ? 'request-stockKitIds-error' : 'request-stockKitIds-help'}><legend className="text-sm font-medium"><RequiredFieldName>Physical kits</RequiredFieldName></legend><p id="request-stockKitIds-help" className="text-xs text-muted-foreground">Only fully registered kits matching the requested size revision are available. You can send the remaining kits later.</p>
        {request.lines.filter(line => line.dispatchedQuantity < line.requestedQuantity).map(line => {
          const kits = availableStockKits.filter(kit => kit.containerDefinitionId === line.containerDefinitionId), remaining = line.requestedQuantity - line.dispatchedQuantity
          const count = kits.filter(kit => selected.includes(kit.id)).length
          return <div key={line.id} className="overflow-hidden rounded-md border"><div className="border-b bg-muted px-3 py-2 text-sm"><p className="font-medium wrap-anywhere">{line.commonName} · {line.sku}</p><p className="text-xs text-muted-foreground">{remaining} still needed · {kits.length} ready at Phaeno</p></div><div className="divide-y px-3">{kits.map(kit => <label key={kit.id} className="flex cursor-pointer items-start gap-2 py-2 text-sm"><input type="checkbox" value={kit.id} className="mt-0.5 accent-primary" disabled={mutation.isPending || (!selected.includes(kit.id) && count >= remaining)} {...form.register('stockKitIds')} /><span className="wrap-anywhere">{kit.kitNumber} <span className="text-muted-foreground">· {kit.tubeCapacity} tubes</span></span></label>)}{!kits.length ? <p className="py-3 text-sm text-muted-foreground">No ready kits. Prepare and register this size before dispatch.</p> : null}</div></div>
        })}
        {errors.stockKitIds ? <p id="request-stockKitIds-error" role="alert" className="text-xs text-destructive">{errors.stockKitIds.message}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">{input('outboundCarrier', 'Carrier')}{input('outboundTrackingNumber', 'Tracking number')}</div>{input('fulfilledAt', 'Dispatched at', 'datetime-local')}
      <p className="text-xs text-muted-foreground">{selected.length} {selected.length === 1 ? 'kit' : 'kits'} selected. Kits and outbound shipping are included; no additional charge.</p>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button form="kit-request-dispatch" type="submit" disabled={mutation.isPending || !detail.canDispatch || Boolean(refreshError)}>{mutation.isPending ? 'Recording…' : 'Record kit shipment'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
function DispatchField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) { return <div className="min-w-0 space-y-2"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}</div> }
