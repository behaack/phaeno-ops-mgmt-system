import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { getLabWorkOrder, type LabWorkOrderDetail } from '#/api/lab-operations'
import { getOrderErrorMessage } from '#/api/order-management'
import { scanRegisteredSampleTube, scanSampleShippingPacket, type SampleShippingCrosswalkItem, type SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { AcceptRemainingTubesDialog, TubeIntakeExceptionDialog } from './TubeAccessionActions'

export function ContainerAccessionDialog({ initialPacket, canAccession, onClose }: {
  initialPacket: SampleShippingPacketScan; canAccession: boolean; onClose: () => void
}) {
  const client = useQueryClient()
  const tubeInput = useRef<HTMLInputElement>(null)
  const doneButton = useRef<HTMLButtonElement>(null)
  const [tubeBarcode, setTubeBarcode] = useState('')
  const [identified, setIdentified] = useState<string[]>([])
  const [exception, setException] = useState<SampleShippingCrosswalkItem | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [notice, setNotice] = useState('')
  const packetQuery = useQuery({ queryKey: ['accession-packet', initialPacket.barcode], queryFn: () => scanSampleShippingPacket(initialPacket.barcode), initialData: initialPacket })
  const workQuery = useQuery({ queryKey: ['lab-work-order', initialPacket.labWorkOrderId], queryFn: () => getLabWorkOrder(initialPacket.labWorkOrderId) })
  const packet = packetQuery.data
  const containers = workQuery.data?.containers ?? []
  const recorded = packet.crosswalk.filter(row => containers.some(t => t.barcode === row.supplierTubeBarcode && t.intakeDisposition)).length
  const allDone = packet.crosswalk.length > 0 && recorded === packet.crosswalk.length
  const remaining = packet.crosswalk.filter(row => row.supplierTubeBarcode && identified.includes(row.supplierTubeBarcode) && !containers.some(t => t.barcode === row.supplierTubeBarcode && (t.intakeDisposition || t.status !== 'Available')))
  const focusTube = () => window.requestAnimationFrame(() => (tubeInput.current ?? doneButton.current)?.focus())
  const tubeScan = useMutation({ mutationFn: (barcode: string) => scanRegisteredSampleTube(packet.barcode, barcode), retry: false, onSuccess: result => {
    setTubeBarcode('')
    const tube = containers.find(t => t.barcode === result.supplierTubeBarcode)
    if (result.isExpected && (!result.isAccessioned || tube && !tube.intakeDisposition && tube.status === 'Available')) {
      setIdentified(current => current.includes(result.supplierTubeBarcode) ? current : [...current, result.supplierTubeBarcode])
      setNotice(`Tube ${result.supplierTubeBarcode} identified. Inspect it, record any exception, then accept the remaining tubes.`)
    } else setNotice(result.isAccessioned ? `Tube ${result.supplierTubeBarcode} already has a saved record. Open its details for any correction.` : 'This tube does not match the shipment. Check the tube and shipping insert.')
    focusTube()
  }, onError: focusTube })
  const blocked = !canAccession || packet.isVoided || !packet.containerReceivedAt || !workQuery.data || workQuery.isError || packetQuery.isError || ['Cancelled', 'ReadyForRelease'].includes(workQuery.data?.workOrder.status ?? '')
  const unsaved = remaining.length > 0 || Boolean(tubeBarcode.trim())
  const confirmLeave = () => !unsaved || window.confirm('Discard the unsaved tube selection? Previously saved intake decisions will be kept.')
  useBlocker({ shouldBlockFn: () => tubeScan.isPending || !exception && !accepting && !confirmLeave(), enableBeforeUnload: () => unsaved || tubeScan.isPending })
  const close = () => { if (!exception && !accepting && !tubeScan.isPending && confirmLeave()) onClose() }
  const saved = async (detail: LabWorkOrderDetail, barcodes: string[], message: string) => {
    client.setQueryData(['lab-work-order', packet.labWorkOrderId], detail)
    setIdentified(current => current.filter(barcode => !barcodes.includes(barcode)))
    setException(null); setAccepting(false); setNotice(message); tubeScan.reset(); focusTube()
    await Promise.all(['lab-shipment-queue', 'accession-packet', 'lab-receipt-context', 'lab-operations', 'lab-attempts', 'lab-execution', 'sample-shipment', 'sample-shipments', 'platform-sample-shipments'].map(key => client.invalidateQueries({ queryKey: [key] })))
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className="sm:max-w-4xl" onOpenAutoFocus={event => { event.preventDefault(); focusTube() }}>
      <DialogHeader><DialogTitle>Accession tubes in {packet.shipmentNumber}</DialogTitle><DialogDescription>{packet.organizationName} · {packet.authorizationReference} · {packet.packetNumber}. Identify and inspect tubes before storing them. Record exceptions first, then accept the rest.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <p role="status" className="font-medium">{recorded} of {packet.crosswalk.length} expected tubes have an intake decision{allDone ? ' — intake complete' : ''}</p>
        {packet.isVoided ? <Alert variant="destructive"><AlertTitle>Shipping insert is voided</AlertTitle><AlertDescription>{packet.voidReason ?? 'Scan the current shipping insert.'}</AlertDescription></Alert> : !packet.containerReceivedAt ? <Alert><AlertTitle>Receive this shipment first</AlertTitle><AlertDescription>Record its arrival in Receive shipments before accessioning tubes.</AlertDescription></Alert> : null}
        {!canAccession ? <p className="text-sm text-muted-foreground">An authorized laboratory operator must accession these tubes.</p> : null}
        {workQuery.isError || packetQuery.isError ? <Alert variant="destructive"><AlertTitle>Could not refresh shipment details</AlertTitle><AlertDescription><Button variant="outline" onClick={() => { void workQuery.refetch(); void packetQuery.refetch() }}>Try again</Button></AlertDescription></Alert> : null}
        {!allDone ? <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => { event.preventDefault(); if (tubeBarcode.trim() && !blocked && !tubeScan.isPending) tubeScan.mutate(tubeBarcode.trim()) }}>
          <div className="flex-1"><Label htmlFor="accession-tube-barcode">Supplier tube barcode</Label><Input ref={tubeInput} id="accession-tube-barcode" className="mt-2 font-mono" value={tubeBarcode} onChange={event => setTubeBarcode(event.target.value)} autoComplete="off" spellCheck={false} readOnly={tubeScan.isPending} disabled={blocked} /></div>
          <Button type="submit" disabled={blocked || !tubeBarcode.trim() || tubeScan.isPending}>{tubeScan.isPending ? 'Checking tube…' : 'Identify tube'}</Button>
        </form> : null}
        <p className="text-sm text-muted-foreground">For a broken tube that cannot be scanned, use its expected shipment row to record the rejection. Do not record missing tubes as received.</p>
        {notice ? <p role="status" className="text-sm">{notice}</p> : null}
        {tubeScan.error ? <Alert variant="destructive"><AlertTitle>Tube could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(tubeScan.error, 'Check the barcode and try again.')}</AlertDescription></Alert> : null}
        <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Expected tubes and intake decisions</caption><thead className="border-b bg-muted/50"><tr>{['Customer sample', 'Tube barcode', 'Intake', 'Storage', ''].map((label, i) => <th key={i} scope="col" className="p-3 font-medium">{label || <span className="sr-only">Action</span>}</th>)}</tr></thead>
          <tbody>{packet.crosswalk.map(row => { const tube = containers.find(t => t.barcode === row.supplierTubeBarcode); const pending = remaining.some(t => t.supplierTubeBarcode === row.supplierTubeBarcode); return <tr key={row.tubeSlotId ?? row.shipmentItemId} className="border-b last:border-0"><td className="p-3">{row.customerSampleId}<span className="block text-xs text-muted-foreground">{row.sampleName} · Tube {row.tubeOrdinal ?? 1} of {row.tubeCount ?? 1}</span></td><td className="p-3 font-mono break-all">{row.supplierTubeBarcode ?? 'Missing assignment'}</td><td className="p-3">{tube?.intakeDisposition === 'OnHold' ? 'On hold' : tube?.intakeDisposition ?? (pending ? 'Identified — decision pending' : 'Not recorded')}</td><td className="p-3 break-all">{tube?.location ?? (tube?.intakeDisposition === 'Rejected' ? 'Not stored' : '—')}</td><td className="p-3 text-right">{!tube?.intakeDisposition && (!tube || tube.status === 'Available') && row.supplierTubeBarcode ? <Button size="sm" variant="outline" disabled={blocked || tubeScan.isPending} aria-label={`Record exception for ${row.supplierTubeBarcode}`} onClick={() => setException(row)}>Record exception</Button> : null}</td></tr> })}</tbody>
        </table></div>
        {remaining.length ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{remaining.length} identified tube{remaining.length === 1 ? ' awaits' : 's await'} a decision. Saved decisions and unidentified tubes are excluded from bulk acceptance.</p><Button variant="outline" size="sm" disabled={tubeScan.isPending} onClick={() => { setIdentified([]); setNotice('Unsaved selection cleared. Saved intake decisions are unchanged.'); focusTube() }}>Clear selection</Button></div> : null}
      </div>
      <DialogFooter><Button ref={doneButton} variant="outline" disabled={tubeScan.isPending} onClick={close}>{allDone ? 'Done' : 'Close — continue later'}</Button>{!allDone ? <Button disabled={blocked || tubeScan.isPending || !remaining.length} onClick={() => setAccepting(true)}>Accept all remaining ({remaining.length})</Button> : null}</DialogFooter>
      {exception ? <TubeIntakeExceptionDialog row={exception} packet={packet} existing={containers.find(t => t.barcode === exception.supplierTubeBarcode)} onClose={() => { setException(null); focusTube() }} onSaved={detail => saved(detail, [exception.supplierTubeBarcode!], `Exception saved for ${exception.supplierTubeBarcode}.`)} /> : null}
      {accepting && workQuery.data ? <AcceptRemainingTubesDialog rows={remaining} packet={packet} work={workQuery.data} onClose={() => { setAccepting(false); focusTube() }} onSaved={(detail, barcodes) => saved(detail, barcodes, `${barcodes.length} tube(s) accepted and stored.`)} /> : null}
    </DialogContent>
  </Dialog>
}
