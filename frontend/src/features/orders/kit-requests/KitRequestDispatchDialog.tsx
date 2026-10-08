import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { dispatchTransportationKitRequest, resolveTransportationKitBarcode, type AvailableTransportationStockKit, type TransportationKitRequestDetail } from '#/api/transportation-kit-requests'
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

const baseSchema = z.object({ phaenoDestinationId: z.string().optional(), confirmUnavailableFixedDestination: z.boolean(), stockKitIds: z.array(z.string()).min(1, 'Scan at least one physical kit to dispatch.'), outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(100), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the dispatch date and time.').refine(value => Number.isFinite(new Date(value).getTime()), 'Enter a valid dispatch date and time.') })
type Values = z.infer<typeof baseSchema>

export function KitRequestDispatchDialog({ detail, refreshError, onRetryRefresh, onClose, onSaved }: { detail: TransportationKitRequestDetail; refreshError?: unknown; onRetryRefresh?: () => void; onClose: () => void; onSaved: (value: TransportationKitRequestDetail) => void | Promise<void> }) {
  const { request, availableTypes } = detail
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const scanInput = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [scanned, setScanned] = useState<AvailableTransportationStockKit[]>([])
  const [scanIssue, setScanIssue] = useState<string | null>(null)
  const schema = baseSchema.superRefine((values, context) => {
    if (detail.phaenoDestinations?.length && !detail.phaenoDestinations.some(destination => destination.id === values.phaenoDestinationId)) context.addIssue({ code: 'custom', path: ['phaenoDestinationId'], message: 'Choose an available Phaeno ship-to destination.' })
    if (detail.phaenoDestinations?.some(destination => destination.id === values.phaenoDestinationId && destination.isCurrentForNewWork === false)
      && !values.confirmUnavailableFixedDestination) context.addIssue({ code: 'custom', path: ['confirmUnavailableFixedDestination'], message: 'Confirm that receiving can accept the remaining kits at this saved destination.' })
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { phaenoDestinationId: detail.selectedPhaenoDestinationId ?? detail.phaenoDestinations?.[0]?.id, confirmUnavailableFixedDestination: false, stockKitIds: [], outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localContainerDateTime() } })
  const selected = form.watch('stockKitIds')
  const scan = useMutation({ mutationFn: (value: string) => resolveTransportationKitBarcode(request.id, value), onError: () => scanInput.current?.focus(), onSuccess: kit => {
    if (scanned.some(item => item.id === kit.id)) { setScanIssue('This physical kit was already scanned.'); setBarcode(''); scanInput.current?.focus(); return }
    const line = request.lines.find(item => item.containerDefinitionId === kit.containerDefinitionId)
    if (!line || scanned.filter(item => item.containerDefinitionId === kit.containerDefinitionId).length >= line.requestedQuantity - line.dispatchedQuantity) {
      setScanIssue(`The requested quantity of ${kit.commonName} is already scanned for this shipment.`)
      scanInput.current?.focus()
      return
    }
    const next = [...scanned, kit]
    setScanned(next)
    setScanIssue(null)
    form.setValue('stockKitIds', next.map(item => item.id), { shouldDirty: true, shouldValidate: true })
    setBarcode('')
    scanInput.current?.focus()
  } })
  function addScan() {
    const value = barcode.trim()
    if (!value || scan.isPending || mutation.isPending) return
    setScanIssue(null)
    if (scanned.some(kit => kit.kitNumber === value)) { setScanIssue('This physical kit was already scanned.'); setBarcode(''); scanInput.current?.focus(); return }
    scan.mutate(value)
  }
  function removeScan(id: string) {
    const next = scanned.filter(kit => kit.id !== id)
    setScanned(next)
    form.setValue('stockKitIds', next.map(item => item.id), { shouldDirty: true, shouldValidate: true })
    scanInput.current?.focus()
  }
  const savedDestination = detail.phaenoDestinations?.find(destination => destination.id === form.watch('phaenoDestinationId') && destination.isCurrentForNewWork === false)
  const barcodeError = scanIssue ?? (scan.error ? getOrderErrorMessage(scan.error, 'This kit could not be checked. Scan again.') : null)
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
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Record kit shipment</DialogTitle><DialogDescription>{request.organizationName} · {request.departmentName}. Scan the physical kits being delivered to {request.deliveryAddress.label}.</DialogDescription></DialogHeader>
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Dispatch was not recorded</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Review the kits and try again.')}</AlertDescription></Alert> : null}
    {refreshError ? <Alert variant="destructive"><AlertTitle>Request refresh failed</AlertTitle><AlertDescription>Your entries are retained. Refresh the request before recording dispatch. {onRetryRefresh ? <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={onRetryRefresh}>Retry request check</Button> : null}</AlertDescription></Alert> : null}
    <form id="kit-request-dispatch" className="space-y-4" onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
      <div className="rounded-md border bg-muted/30 p-3"><p className="mb-2 text-sm font-semibold">Deliver to {request.deliveryAddress.label}</p><DeliveryLocationAddress location={request.deliveryAddress} /><p className="mt-3 text-xs text-muted-foreground">Originating Job {request.jobNumber}. Unused received kits can serve eligible Jobs at this location.</p></div>
      {detail.phaenoDestinations?.length ? <div className="space-y-2"><Label htmlFor="request-phaeno-destination"><RequiredFieldName>Phaeno ship-to destination</RequiredFieldName></Label><select id="request-phaeno-destination" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" disabled={mutation.isPending || request.kits.length > 0} aria-invalid={Boolean(errors.phaenoDestinationId)} aria-describedby={errors.phaenoDestinationId ? 'request-phaeno-destination-error' : 'request-phaeno-destination-help'} {...form.register('phaenoDestinationId')}><option value="">Select destination</option>{detail.phaenoDestinations.map(destination => <option key={destination.id} value={destination.id}>{destination.name} · revision {destination.revision}{destination.isCurrentForNewWork === false ? ' (saved route; inactive)' : ''}</option>)}</select><p id="request-phaeno-destination-help" className="text-xs text-muted-foreground">Customer samples return here. This is separate from the delivery location above. The destination is fixed after the first kit is sent.</p>{errors.phaenoDestinationId ? <p id="request-phaeno-destination-error" role="alert" className="text-xs text-destructive">{errors.phaenoDestinationId.message}</p> : null}</div> : null}
      {savedDestination ? <div className="space-y-2"><Alert><AlertTitle>Saved destination no longer active</AlertTitle><AlertDescription>The first kit fixed this Job to {savedDestination.name} · revision {savedDestination.revision}. Confirm that receiving can accept the remaining kits here. A new Default does not redirect this Job.</AlertDescription></Alert><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" disabled={mutation.isPending} aria-invalid={Boolean(errors.confirmUnavailableFixedDestination)} aria-describedby={errors.confirmUnavailableFixedDestination ? 'request-confirm-destination-error' : undefined} {...form.register('confirmUnavailableFixedDestination')} /><RequiredFieldName>Receiving can accept the remaining kits at this saved destination</RequiredFieldName></label>{errors.confirmUnavailableFixedDestination ? <p id="request-confirm-destination-error" role="alert" className="text-xs text-destructive">{errors.confirmUnavailableFixedDestination.message}</p> : null}</div> : null}
      <fieldset className="space-y-3" aria-describedby={errors.stockKitIds ? 'request-stockKitIds-error' : 'request-stockKitIds-help'}><legend className="text-sm font-medium"><RequiredFieldName>Physical kits</RequiredFieldName></legend><p id="request-stockKitIds-help" className="text-xs text-muted-foreground">Scan or enter each complete kit barcode. Only ready kits of the requested types can be shipped. You can send part of the request now and the rest later.</p>
        <div className="rounded-md border bg-muted/30 p-3"><p className="text-sm font-medium">Requested kit types</p><ul className="mt-2 space-y-1 text-sm">{availableTypes.map(type => <li key={type.containerDefinitionId} className="flex flex-wrap justify-between gap-x-3"><span>{type.commonName} · {type.sku} · {type.tubeCapacity} tubes</span><span className="text-muted-foreground">{type.requestedQuantity} requested · {type.dispatchedQuantity} sent · {type.availableQuantity} ready</span></li>)}</ul></div>
        <div className="space-y-1.5"><Label htmlFor="request-kit-barcode">Kit barcode</Label><div className="flex gap-2"><Input ref={scanInput} id="request-kit-barcode" value={barcode} maxLength={100} autoComplete="off" disabled={scan.isPending || mutation.isPending} aria-invalid={Boolean(barcodeError || errors.stockKitIds)} aria-describedby={['request-stockKitIds-help', barcodeError ? 'request-kit-barcode-error' : null, errors.stockKitIds ? 'request-stockKitIds-error' : null].filter(Boolean).join(' ')} onChange={event => { setBarcode(event.target.value); setScanIssue(null); scan.reset() }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addScan() } }} /><Button type="button" variant="outline" disabled={!barcode.trim() || scan.isPending || mutation.isPending} onClick={addScan}>{scan.isPending ? 'Checking…' : 'Add kit'}</Button></div>{barcodeError ? <p id="request-kit-barcode-error" role="alert" className="text-xs text-destructive">{barcodeError}</p> : null}{errors.stockKitIds ? <p id="request-stockKitIds-error" role="alert" className="text-xs text-destructive">{errors.stockKitIds.message}</p> : null}</div>
        {scanned.length ? <ul aria-label="Scanned kits" className="max-h-48 divide-y overflow-y-auto rounded-md border">{scanned.map(kit => <li key={kit.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><span className="min-w-0 wrap-anywhere">{kit.kitNumber} <span className="text-muted-foreground">· {kit.commonName} · {kit.tubeCapacity} tubes</span></span><Button type="button" variant="ghost" size="sm" disabled={scan.isPending || mutation.isPending} onClick={() => removeScan(kit.id)} aria-label={`Remove ${kit.kitNumber}`}>Remove</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">No kits scanned yet.</p>}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">{input('outboundCarrier', 'Carrier')}{input('outboundTrackingNumber', 'Tracking number')}</div>{input('fulfilledAt', 'Dispatched at', 'datetime-local')}
      <p className="text-xs text-muted-foreground">{selected.length} {selected.length === 1 ? 'kit' : 'kits'} scanned. Kits and outbound shipping are included; no additional charge.</p>
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button form="kit-request-dispatch" type="submit" disabled={mutation.isPending || !detail.canDispatch || Boolean(refreshError)}>{mutation.isPending ? 'Recording…' : 'Record kit shipment'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
function DispatchField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) { return <div className="min-w-0 space-y-2"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}</div> }
