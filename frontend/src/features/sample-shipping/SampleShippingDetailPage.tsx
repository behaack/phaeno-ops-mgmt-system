import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download, Printer, ScanBarcode } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

const assignmentSchema = z.object({ supplierBarcode: z.string().trim().min(4, 'Scan or enter the complete tube barcode.').max(100), reason: z.string().trim().max(1000) })
const shipmentSchema = z.object({ carrier: z.string().trim().min(1, 'Enter the carrier.').max(255), trackingNumber: z.string().trim().min(1, 'Enter the tracking number.').max(255), shippedAt: z.string().min(1, 'Enter the shipment time.') })
type AssignmentValues = z.infer<typeof assignmentSchema>
type ShipmentValues = z.infer<typeof shipmentSchema>

export function SampleShippingDetailPage({ shipmentId }: { shipmentId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const client = useQueryClient()
  const canView = Boolean(session?.capabilities.canViewSampleShipping)
  const canManage = Boolean(session?.capabilities.canManageSampleShipping)
  const query = useQuery({ queryKey: ['sample-shipment', shipmentId], queryFn: () => getSampleShipment(shipmentId), enabled: canView && authProvider !== 'mock' })
  const [assignmentItem, setAssignmentItem] = useState<SampleShippingCrosswalkItem | null>(null)
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [packetAction, setPacketAction] = useState<'confirm' | 'replace' | null>(null)
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['sample-shipment', shipmentId] }), client.invalidateQueries({ queryKey: ['sample-shipments'] })]) }
  const assignment = useMutation({ mutationFn: ({ item, values }: { item: SampleShippingCrosswalkItem; values: AssignmentValues }) => assignSampleTube(shipmentId, item.shipmentItemId, { ...values, reason: values.reason || null, version: item.version }), onSuccess: async () => { setAssignmentItem(null); await refresh() } })
  const issue = useMutation({ mutationFn: (replacementReason: string | null) => issueSampleShippingPacket(shipmentId, { version: query.data!.version, replacementReason }), onSuccess: async () => { setPacketAction(null); await refresh() } })
  const shipped = useMutation({ mutationFn: (values: ShipmentValues) => recordSampleShipment(shipmentId, { carrier: values.carrier, trackingNumber: values.trackingNumber, shippedAt: new Date(values.shippedAt).toISOString(), version: query.data!.version }), onSuccess: async () => { setShipmentOpen(false); await refresh() } })
  const download = useMutation({ mutationFn: () => downloadSampleShippingCrosswalk(shipmentId), onSuccess: (blob) => { const href = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${query.data?.shipmentNumber ?? 'sample-shipment'}-tube-crosswalk.csv`; anchor.click(); URL.revokeObjectURL(href) } })

  if (!canView) return <Unavailable />
  if (query.isLoading) return <main className="page-wrap px-4 py-8"><p role="status" className="text-sm text-muted-foreground">Loading sample shipment…</p></main>
  if (query.error || !query.data) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Shipment unavailable</AlertTitle><AlertDescription>{query.error ? apiErrorMessage(query.error) : 'The requested shipment was not found.'}</AlertDescription></Alert></main>
  const shipment = query.data
  const matchedCount = shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length
  const readyToConfirm = shipment.returnKit?.status === 'Fulfilled' && matchedCount === shipment.crosswalk.length && shipment.crosswalk.length > 0 && shipment.status === 'Preparing'
  const error = assignment.error ?? issue.error ?? shipped.error ?? download.error

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {shipment.authorizationSource === 'CustomerPromotionalOrder' ? (
            <Link
              to="/lab-services/$orderId"
              params={{ orderId: shipment.authorizationSourceId }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to lab job {shipment.authorizationReference}
            </Link>
          ) : (
            <Link to="/sample-shipping" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Samples and shipping
            </Link>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{shipment.shipmentNumber}</h1>
            <Badge variant="outline">{humanize(shipment.status)}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shipment.authorizationReference} · {shipment.destinationName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {shipment.currentPacket ? (
            <>
              <Button variant="outline" asChild><Link to="/sample-shipping/$shipmentId/packet" params={{ shipmentId }}><Printer data-icon="inline-start" />View packet</Link></Button>
              <Button variant="outline" disabled={download.isPending} onClick={() => download.mutate()}><Download data-icon="inline-start" />Crosswalk CSV</Button>
            </>
          ) : null}
          {canManage && readyToConfirm ? <Button onClick={() => setPacketAction('confirm')}>Review and confirm packet</Button> : null}
          {canManage && shipment.status === 'ReadyToShip' && shipment.currentPacket ? <Button variant="outline" onClick={() => setPacketAction('replace')}>Replace packet</Button> : null}
          {canManage && shipment.status === 'ReadyToShip' ? <Button onClick={() => setShipmentOpen(true)}>Record shipment</Button> : null}
        </div>
      </section>
      {error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Shipment was not updated</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <Card><CardHeader><CardTitle>Tube-to-sample crosswalk</CardTitle><CardDescription>Use only your non-PHI sample identifier. Scan the permanent barcode already printed on each Phaeno-supplied tube.</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3 font-medium">Sample ID</th><th className="px-2 py-3 font-medium">Sample</th><th className="px-2 py-3 font-medium">Tube barcode</th><th className="px-2 py-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead><tbody>{shipment.crosswalk.map((item) => <tr key={item.shipmentItemId} className="border-b last:border-0"><td className="px-2 py-3 font-medium">{item.customerSampleId}</td><td className="px-2 py-3">{item.sampleName}<p className="mt-1 text-xs text-muted-foreground">{item.sampleTypeName} · {item.quantity} {item.quantityUnit}</p></td><td className="px-2 py-3 font-mono">{item.supplierTubeBarcode ?? 'Not matched'}{item.supplierTubeBarcode ? <p className="mt-1 font-sans text-xs text-muted-foreground">{humanize(item.tubeStatus)}</p> : null}</td><td className="px-2 py-3 text-right">{canManage && (shipment.status === 'Preparing' || shipment.status === 'ReadyToShip') && shipment.returnKit?.status === 'Fulfilled' ? <Button size="sm" variant="outline" onClick={() => setAssignmentItem(item)}><ScanBarcode data-icon="inline-start" />{shipment.currentPacket ? 'Correct tube' : item.supplierTubeBarcode ? 'Change' : 'Match tube'}</Button> : null}</td></tr>)}</tbody></table></div></CardContent></Card>
        <div className="space-y-5"><Card><CardHeader><CardTitle>Return kit</CardTitle><CardDescription>Phaeno registers these materials before sending them to you.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm">{shipment.returnKit ? <><Info label="Kit" value={shipment.returnKit.kitNumber} /><Info label="Tube" value={`${shipment.returnKit.tubeSupplierName} ${shipment.returnKit.tubeProductNumber}`} /><Info label="Shipper" value={`${shipment.returnKit.shipperSupplierName} ${shipment.returnKit.shipperProductNumber}`} /><Info label="Registered tubes" value={`${shipment.returnKit.tubes.length} of ${shipment.returnKit.requiredTubeCount}`} /><Info label="Outbound tracking" value={shipment.returnKit.outboundTrackingNumber ?? 'Not yet recorded'} /></> : <p className="text-muted-foreground">Phaeno has not prepared the return kit yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Before confirming</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Verify every Customer sample ID is non-PHI and matches your internal records.</li><li>Verify each physical tube barcode matches the row shown here.</li><li>Keep the packet or download the CSV for your records.</li></ul><p className="mt-4 text-sm font-medium">{matchedCount} of {shipment.crosswalk.length} tubes matched</p></CardContent></Card></div>
      </div>

      <TubeAssignmentDialog item={assignmentItem} replacesPacket={Boolean(shipment.currentPacket)} isPending={assignment.isPending} error={assignment.error ? apiErrorMessage(assignment.error) : undefined} onOpenChange={(open) => { if (!open) setAssignmentItem(null) }} onSubmit={(values) => { if (assignmentItem) assignment.mutate({ item: assignmentItem, values }) }} />
      <ConfirmPacketDialog action={packetAction} shipmentNumber={shipment.shipmentNumber} sampleCount={shipment.crosswalk.length} isPending={issue.isPending} onOpenChange={(open) => { if (!open) setPacketAction(null) }} onConfirm={(reason) => issue.mutate(reason)} />
      <RecordShipmentDialog open={shipmentOpen} isPending={shipped.isPending} error={shipped.error ? apiErrorMessage(shipped.error) : undefined} onOpenChange={setShipmentOpen} onSubmit={(values) => shipped.mutate(values)} />
    </main>
  )
}

function TubeAssignmentDialog({ item, replacesPacket, isPending, error, onOpenChange, onSubmit }: { item: SampleShippingCrosswalkItem | null; replacesPacket: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: AssignmentValues) => void }) {
  const form = useForm<AssignmentValues>({ resolver: zodResolver(assignmentSchema), defaultValues: { supplierBarcode: '', reason: '' } })
  useEffect(() => { if (item) form.reset({ supplierBarcode: item.supplierTubeBarcode ?? '', reason: '' }) }, [form, item])
  const submit = form.handleSubmit((values) => {
    if (item?.supplierTubeBarcode && !values.reason.trim()) {
      form.setError('reason', { type: 'required', message: 'Enter a reason for changing the tube assignment.' })
      return
    }
    onSubmit(values)
  })
  return <Dialog open={Boolean(item)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{item?.supplierTubeBarcode ? 'Change tube assignment' : 'Match tube to sample'}</DialogTitle><DialogDescription>{item ? replacesPacket ? `Scan the replacement Phaeno-supplied tube for ${item.customerSampleId}. Saving voids the current packet and issues a corrected revision.` : `Scan the Phaeno-supplied tube for ${item.customerSampleId}.` : ''}</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="tube-assignment" className="grid gap-4" noValidate onSubmit={submit}><div className="grid gap-1.5"><Label htmlFor="supplier-barcode"><RequiredFieldName>Supplier tube barcode</RequiredFieldName></Label><Input id="supplier-barcode" autoComplete="off" className="font-mono uppercase" aria-invalid={Boolean(form.formState.errors.supplierBarcode)} {...form.register('supplierBarcode')} />{form.formState.errors.supplierBarcode ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.supplierBarcode.message}</p> : null}</div>{item?.supplierTubeBarcode ? <div className="grid gap-1.5"><Label htmlFor="assignment-reason"><RequiredFieldName>Correction reason</RequiredFieldName></Label><Input id="assignment-reason" aria-invalid={Boolean(form.formState.errors.reason)} {...form.register('reason')} />{form.formState.errors.reason ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}<p className="text-xs text-muted-foreground">The original assignment remains in history.</p></div> : null}</form><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="tube-assignment" disabled={isPending}>{isPending ? 'Saving…' : replacesPacket ? 'Save and replace packet' : 'Save match'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}

function ConfirmPacketDialog({ action, shipmentNumber, sampleCount, isPending, onOpenChange, onConfirm }: { action: 'confirm' | 'replace' | null; shipmentNumber: string; sampleCount: number; isPending: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reason: string | null) => void }) { const [reason, setReason] = useState(''); const replacing = action === 'replace'; useEffect(() => { if (action) setReason('') }, [action]); return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{replacing ? 'Replace shipping packet' : 'Confirm shipping packet'}</DialogTitle><DialogDescription>{replacing ? `This voids the current packet for ${shipmentNumber} and issues a new frozen revision. Destroy any unused copy of the old packet.` : `This freezes the ${sampleCount}-sample tube crosswalk for ${shipmentNumber}. A later correction will void this packet and issue a new revision.`}</DialogDescription></DialogHeader>{replacing ? <div className="grid gap-1.5"><Label htmlFor="packet-replacement-reason"><RequiredFieldName>Replacement reason</RequiredFieldName></Label><Input id="packet-replacement-reason" value={reason} onChange={(event) => setReason(event.target.value)} /><p className="text-xs text-muted-foreground">The prior packet and reason remain in shipment history.</p></div> : null}<RequiredDialogFooter showLegend={replacing}><Button variant="outline" onClick={() => onOpenChange(false)}>Keep reviewing</Button><Button disabled={isPending || (replacing && !reason.trim())} onClick={() => onConfirm(replacing ? reason.trim() : null)}>{isPending ? 'Confirming…' : replacing ? 'Void and replace packet' : 'Confirm and issue packet'}</Button></RequiredDialogFooter></DialogContent></Dialog> }

function RecordShipmentDialog({ open, isPending, error, onOpenChange, onSubmit }: { open: boolean; isPending: boolean; error?: string; onOpenChange: (open: boolean) => void; onSubmit: (values: ShipmentValues) => void }) { const form = useForm<ShipmentValues>({ resolver: zodResolver(shipmentSchema), defaultValues: { carrier: '', trackingNumber: '', shippedAt: localDateTime() } }); useEffect(() => { if (open) form.reset({ carrier: '', trackingNumber: '', shippedAt: localDateTime() }) }, [form, open]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record return shipment</DialogTitle><DialogDescription>Enter the carrier facts from your receipt. Phaeno does not purchase or track postage through this screen.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="record-shipment" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><Field id="shipment-carrier" label="Carrier" error={form.formState.errors.carrier?.message}><Input id="shipment-carrier" {...form.register('carrier')} /></Field><Field id="shipment-tracking" label="Tracking number" error={form.formState.errors.trackingNumber?.message}><Input id="shipment-tracking" {...form.register('trackingNumber')} /></Field><Field id="shipment-time" label="Shipped at" error={form.formState.errors.shippedAt?.message}><Input id="shipment-time" type="datetime-local" {...form.register('shippedAt')} /></Field></form><RequiredDialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="record-shipment" disabled={isPending}>{isPending ? 'Saving…' : 'Record shipment'}</Button></RequiredDialogFooter></DialogContent></Dialog> }

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label htmlFor={id}><RequiredFieldName>{label}</RequiredFieldName></Label>{children}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
function Unavailable() { return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Sample shipping unavailable</AlertTitle><AlertDescription>Select an active Prospect or Customer organization.</AlertDescription></Alert></main> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
function localDateTime() { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
