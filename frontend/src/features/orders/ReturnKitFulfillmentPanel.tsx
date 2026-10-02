import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, ScanBarcode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { fulfillSampleReturnKit, getPlatformReturnKitShipments, registerSampleTubes, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogReturnFocus, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/ui/field'
import { parseKitRequestSearch } from './kit-requests/kit-request-navigation'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const tubesSchema = z.object({ supplierBarcodes: z.string().trim().min(1, 'Scan at least one tube barcode.') })
const fulfillmentSchema = z.object({ outboundCarrier: z.string().trim().min(1, 'Enter the carrier.').max(255), outboundTrackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), fulfilledAt: z.string().min(1, 'Enter the fulfillment time.') })
type TubesValues = z.infer<typeof tubesSchema>
type FulfillmentValues = z.infer<typeof fulfillmentSchema>

type TubesAction = { kind: 'tubes'; shipment: SampleShipmentWorkflow }
type FulfillmentAction = { kind: 'fulfill'; shipment: SampleShipmentWorkflow }
type Action = TubesAction | FulfillmentAction | null

export function ReturnKitFulfillmentPanel({ apiEnabled, shipmentId, showEmpty = false }: { apiEnabled: boolean; shipmentId?: string; showEmpty?: boolean }) {
  const client = useQueryClient(), navigate = useNavigate(), currentSearch = useSearch({ strict: false })
  const search = parseKitRequestSearch(currentSearch)
  const needle = (search.kitShipmentSearch ?? '').trim(), page = search.kitShipmentPage ?? 1
  const [debouncedSearch, setDebouncedSearch] = useState(needle)
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(needle), 300); return () => clearTimeout(timer) }, [needle])
  const waitingForSearch = needle !== debouncedSearch
  const [action, setAction] = useState<Action>(null)
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  function openAction(next: Exclude<Action, null>) { returnFocus.current = triggers.current.get(next.shipment.id) ?? null; setAction(next) }
  function closeAction() { setAction(null) }
  const query = useQuery({ queryKey: ['sample-shipping-workflow', 'return-kits', debouncedSearch, page, shipmentId], queryFn: () => getPlatformReturnKitShipments(debouncedSearch, page, shipmentId), enabled: apiEnabled && !waitingForSearch })
  const refresh = () => client.invalidateQueries({ queryKey: ['sample-shipping-workflow'] })
  const addTubes = useMutation({ mutationFn: ({ shipment, values }: { shipment: SampleShipmentWorkflow; values: TubesValues }) => registerSampleTubes(shipment.returnKit!.id, { supplierBarcodes: values.supplierBarcodes.split(/[\r\n,]+/).map((value) => value.trim()).filter(Boolean), version: shipment.returnKit!.version }), onSuccess: async () => { closeAction(); await refresh() } })
  const fulfill = useMutation({ mutationFn: ({ shipment, values }: { shipment: SampleShipmentWorkflow; values: FulfillmentValues }) => fulfillSampleReturnKit(shipment.returnKit!.id, { outboundCarrier: values.outboundCarrier, outboundTrackingNumber: values.outboundTrackingNumber, fulfilledAt: new Date(values.fulfilledAt).toISOString(), version: shipment.returnKit!.version }), onSuccess: async () => { closeAction(); await refresh() } })
  const error = (waitingForSearch ? null : query.error) ?? addTubes.error ?? fulfill.error
  const data = waitingForSearch ? undefined : query.data, shipments = data?.items ?? []
  const pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 20)))
  function changeSearch(value: string, nextPage = 1, replace = true) {
    void navigate({ to: '/lab-operations', search: previous => ({ ...previous, section: 'receipt', receiptTab: 'kit-requests', kitQueue: 'sent', kitShipmentSearch: value || undefined, kitShipmentPage: nextPage }), replace, resetScroll: false })
  }
  if (!apiEnabled || (!showEmpty && !needle && !waitingForSearch && query.isSuccess && !data?.totalCount)) return null

  return <Card className="min-w-0 gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <div className="flex items-start gap-3">
        <PackageCheck aria-hidden="true" className="mt-0.5 size-5 text-primary" />
        <div><CardTitle>Shipment-specific kits sent</CardTitle><CardDescription>Review and complete shipment-specific kits and their fulfillment dates.</CardDescription></div>
      </div>
      <div className="col-span-full mt-3 flex min-w-0 items-center gap-3">
        <Field className="min-w-0 flex-1"><Input id="kit-shipment-search" maxLength={255} aria-label="Search kit shipments" placeholder="Shipment, Job, Customer, or kit number" value={search.kitShipmentSearch ?? ''} onChange={event => changeSearch(event.target.value)} /></Field>
        {needle ? <Button variant="ghost" onClick={() => changeSearch('')}>Clear search</Button> : null}
      </div>
    </CardHeader>
    <CardContent className="min-w-0 p-4">
      {shipmentId ? <p className="mb-4 text-sm">Showing the selected shipment. <Link to="/lab-operations" search={{ ...currentSearch, shipmentId: undefined, section: 'receipt', receiptTab: 'kit-requests', kitQueue: 'sent' }} className="text-primary underline">Show all shipments</Link></p> : null}
      {error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Return kits could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh and try again.')}</AlertDescription></Alert> : null}
      {waitingForSearch || query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading return kits…</p> : null}
      {shipments.length ? <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[660px] text-left text-sm">
          <thead className="border-b bg-muted text-foreground"><tr><th className="px-2 py-3 font-medium">Shipment</th><th className="px-2 py-3 font-medium">Organization</th><th className="px-2 py-3 font-medium">Kit</th><th className="px-2 py-3 font-medium">Registered tubes</th><th className="px-2 py-3 font-medium">Fulfillment date</th><th className="px-2 py-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{shipments.map(shipment => <tr key={shipment.id} className="border-b bg-muted/20 last:border-0">
            <td className="px-2 py-3"><Link to="/lab-operations/$workOrderId" params={{ workOrderId: shipment.labWorkOrderId }} search={{ ...currentSearch, section: 'receipt', receiptTab: 'kit-requests', kitQueue: 'sent' }} className="font-medium text-primary underline">{shipment.shipmentNumber}</Link><p className="mt-1 text-xs text-muted-foreground">{shipment.authorizationReference}</p></td>
            <td className="px-2 py-3">{shipment.organizationName}</td>
            <td className="px-2 py-3"><span className="font-mono">{shipment.returnKit!.kitNumber}</span><p className="mt-1"><Badge variant="outline">{humanize(shipment.returnKit!.status)}</Badge></p></td>
            <td className="px-2 py-3">{shipment.returnKit!.tubes.length + ' of ' + shipment.returnKit!.requiredTubeCount}</td>
            <td className="px-2 py-3 whitespace-nowrap">{shipment.returnKit!.fulfilledAt ? <time dateTime={shipment.returnKit!.fulfilledAt}>{new Date(shipment.returnKit!.fulfilledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time> : '—'}</td>
            <td className="px-2 py-3"><div className="flex justify-end">
              {shipment.returnKit!.status === 'Preparing' ? <ActionMenu modal={false}><DropdownMenuTrigger asChild><Button ref={node => { if (node) triggers.current.set(shipment.id, node); else triggers.current.delete(shipment.id) }} size="sm" variant="outline" aria-label={'Actions for shipment ' + shipment.shipmentNumber}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openAction({ kind: 'tubes', shipment })}><ScanBarcode aria-hidden="true" />Register tubes</DropdownMenuItem>
                {shipment.returnKit!.tubes.length === shipment.returnKit!.requiredTubeCount ? <DropdownMenuItem onSelect={() => openAction({ kind: 'fulfill', shipment })}>Fulfill kit</DropdownMenuItem> : null}
              </DropdownMenuContent></ActionMenu> : null}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : data && !query.isError ? <p className="py-8 text-center text-sm text-muted-foreground">{needle ? 'No kit shipments match this search.' : 'No shared sample shipments are ready for return-kit fulfillment.'}</p> : null}
      {data && !query.isError ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span aria-live="polite">{data.totalCount} {data.totalCount === 1 ? 'shipment' : 'shipments'} · Page {data.page} of {pages}</span><nav aria-label="Kit shipment pages" className="flex gap-2"><Button variant="outline" size="sm" disabled={query.isFetching || data.page <= 1} onClick={() => changeSearch(search.kitShipmentSearch ?? '', data.page - 1, false)}>Previous</Button><Button variant="outline" size="sm" disabled={query.isFetching || data.page >= pages} onClick={() => changeSearch(search.kitShipmentSearch ?? '', data.page + 1, false)}>Next</Button></nav></div> : null}
      <DialogReturnFocus target={returnFocus.current} fallbackId="kit-shipment-search">
        <TubesDialog error={addTubes.error ? getOrderErrorMessage(addTubes.error, 'Review the entered values and try again.') : undefined} action={action?.kind === 'tubes' ? action : null} isPending={addTubes.isPending} onOpenChange={open => { if (!open) closeAction() }} onSubmit={values => { if (action) addTubes.mutate({ shipment: action.shipment, values }) }} />
        <FulfillmentDialog error={fulfill.error ? getOrderErrorMessage(fulfill.error, 'Review the entered values and try again.') : undefined} action={action?.kind === 'fulfill' ? action : null} isPending={fulfill.isPending} onOpenChange={open => { if (!open) closeAction() }} onSubmit={values => { if (action) fulfill.mutate({ shipment: action.shipment, values }) }} />
      </DialogReturnFocus>
    </CardContent>
  </Card>
}

function TubesDialog({ error, action, isPending, onOpenChange, onSubmit }: { error?: string; action: TubesAction | null; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: TubesValues) => void }) { const form = useForm<TubesValues>({ resolver: zodResolver(tubesSchema), defaultValues: { supplierBarcodes: '' } }); useEffect(() => { if (action) form.reset() }, [action, form]); const remaining = action ? action.shipment.returnKit!.requiredTubeCount - action.shipment.returnKit!.tubes.length : 0; return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Register supplier-barcoded tubes</DialogTitle><DialogDescription>Scan one tube per line. {remaining} {remaining === 1 ? 'tube remains' : 'tubes remain'} for this kit.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertTitle>Changes were not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="register-tubes" noValidate onSubmit={form.handleSubmit(onSubmit)}><Label htmlFor="tube-barcodes"><RequiredFieldName>Tube barcodes</RequiredFieldName></Label><textarea id="tube-barcodes" className="mt-2 min-h-40 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm uppercase" aria-invalid={Boolean(form.formState.errors.supplierBarcodes)} {...form.register('supplierBarcodes')} />{form.formState.errors.supplierBarcodes ? <p role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.supplierBarcodes.message}</p> : null}</form><RequiredDialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="register-tubes" disabled={isPending}>{isPending ? 'Registering…' : 'Register tubes'}</Button></RequiredDialogFooter></DialogContent></Dialog> }
function FulfillmentDialog({ error, action, isPending, onOpenChange, onSubmit }: { error?: string; action: FulfillmentAction | null; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: FulfillmentValues) => void }) { const form = useForm<FulfillmentValues>({ resolver: zodResolver(fulfillmentSchema), defaultValues: { outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localDateTime() } }); useEffect(() => { if (action) form.reset({ outboundCarrier: '', outboundTrackingNumber: '', fulfilledAt: localDateTime() }) }, [action, form]); return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Fulfill return kit</DialogTitle><DialogDescription>This freezes the registered tube membership sent to the external organization.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertTitle>Changes were not saved</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="fulfill-return-kit" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><FormField id="outbound-carrier" label="Carrier" error={form.formState.errors.outboundCarrier?.message}><Input id="outbound-carrier" {...form.register('outboundCarrier')} /></FormField><FormField id="outbound-tracking" label="Tracking number" error={form.formState.errors.outboundTrackingNumber?.message}><Input id="outbound-tracking" {...form.register('outboundTrackingNumber')} /></FormField><FormField id="outbound-time" label="Fulfilled at" error={form.formState.errors.fulfilledAt?.message}><Input id="outbound-time" type="datetime-local" {...form.register('fulfilledAt')} /></FormField></form><RequiredDialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="fulfill-return-kit" disabled={isPending}>{isPending ? 'Fulfilling…' : 'Fulfill kit'}</Button></RequiredDialogFooter></DialogContent></Dialog> }
function FormField({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label htmlFor={id}>{optional ? label : <RequiredFieldName>{label}</RequiredFieldName>}</Label>{children}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
function localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
