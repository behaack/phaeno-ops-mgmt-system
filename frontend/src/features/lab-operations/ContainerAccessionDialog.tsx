import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { accessionShipmentTube, getLabWorkOrder } from '#/api/lab-operations'
import { getOrderErrorMessage } from '#/api/order-management'
import { scanRegisteredSampleTube, scanSampleShippingPacket, type RegisteredSampleTubeScan, type SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const boxSchema = z.object({ freezerBoxBarcode: z.string().trim().min(1, 'Scan the freezer box barcode.').max(255, 'Use a barcode of up to 255 characters.').refine(value => !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'Use a barcode without control characters.') })
type BoxForm = z.infer<typeof boxSchema>

export function ContainerAccessionDialog({ initialPacket, canAccession, onClose }: {
  initialPacket: SampleShippingPacketScan
  canAccession: boolean
  onClose: () => void
}) {
  const client = useQueryClient()
  const tubeInput = useRef<HTMLInputElement>(null)
  const doneButton = useRef<HTMLButtonElement>(null)
  const [tubeBarcode, setTubeBarcode] = useState('')
  const [selectedTube, setSelectedTube] = useState<RegisteredSampleTubeScan | null>(null)
  const [notice, setNotice] = useState('')
  const packetQuery = useQuery({ queryKey: ['accession-packet', initialPacket.barcode], queryFn: () => scanSampleShippingPacket(initialPacket.barcode), initialData: initialPacket })
  const workQuery = useQuery({ queryKey: ['lab-work-order', initialPacket.labWorkOrderId], queryFn: () => getLabWorkOrder(initialPacket.labWorkOrderId) })
  const packet = packetQuery.data
  const containers = workQuery.data?.containers ?? []
  const completed = packet.crosswalk.filter(row => row.tubeStatus === 'Accessioned' || containers.some(container => container.barcode === row.supplierTubeBarcode)).length
  const allDone = packet.crosswalk.length > 0 && completed === packet.crosswalk.length
  const focusTube = () => window.requestAnimationFrame(() => (tubeInput.current ?? doneButton.current)?.focus())
  const tubeScan = useMutation({
    mutationFn: (barcode: string) => scanRegisteredSampleTube(packet.barcode, barcode),
    retry: false,
    onSuccess: result => {
      setTubeBarcode('')
      if (result.isExpected && !result.isAccessioned) {
        setNotice('')
        setSelectedTube(result)
      } else {
        setNotice(result.isAccessioned ? `Tube ${result.supplierTubeBarcode} was already accessioned.` : 'This tube does not match the container. Check the tube and shipping insert.')
        if (result.isAccessioned) { void packetQuery.refetch(); void workQuery.refetch() }
        focusTube()
      }
    },
    onError: focusTube,
  })
  const blocked = !canAccession || packet.isVoided || !packet.containerReceivedAt || !workQuery.data || workQuery.isError || packetQuery.isError

  return <Dialog open onOpenChange={open => { if (!open && !selectedTube && !tubeScan.isPending) onClose() }}>
    <DialogContent className="sm:max-w-4xl" onOpenAutoFocus={event => { event.preventDefault(); focusTube() }}>
      <DialogHeader>
        <DialogTitle>Accession samples in {packet.shipmentNumber}</DialogTitle>
        <DialogDescription>{packet.organizationName} · {packet.authorizationReference} · {packet.packetNumber}. Scan each tube, then its freezer box.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p role="status" className="font-medium">{completed} of {packet.crosswalk.length} expected tubes accessioned{allDone ? ' — container complete' : ''}</p>
        {packet.isVoided ? <Alert variant="destructive"><AlertTitle>Shipping insert is voided</AlertTitle><AlertDescription>{packet.voidReason ?? 'Scan the current shipping insert.'}</AlertDescription></Alert> : !packet.containerReceivedAt ? <Alert><AlertTitle>Receive this shipment first</AlertTitle><AlertDescription>Record its arrival in Receive shipments before accessioning tubes.</AlertDescription></Alert> : null}
        {!canAccession ? <p className="text-sm text-muted-foreground">An authorized laboratory operator must accession these tubes.</p> : null}
        {workQuery.isError || packetQuery.isError ? <Alert variant="destructive"><AlertTitle>Could not refresh container details</AlertTitle><AlertDescription><Button variant="outline" onClick={() => { void workQuery.refetch(); void packetQuery.refetch() }}>Try again</Button></AlertDescription></Alert> : null}
        {!allDone ? <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={event => {
          event.preventDefault()
          if (tubeBarcode.trim() && !blocked && !tubeScan.isPending) { setNotice(''); tubeScan.mutate(tubeBarcode.trim()) }
        }}>
          <div className="flex-1"><Label htmlFor="accession-tube-barcode">Supplier tube barcode</Label><Input ref={tubeInput} id="accession-tube-barcode" className="mt-2 font-mono" value={tubeBarcode} onChange={event => setTubeBarcode(event.target.value)} autoComplete="off" spellCheck={false} readOnly={tubeScan.isPending} /></div>
          <Button type="submit" disabled={blocked || !tubeBarcode.trim() || tubeScan.isPending}>{tubeScan.isPending ? 'Checking tube…' : 'Scan tube'}</Button>
        </form> : <p>All expected tubes are accessioned. You can close this container and scan the next shipping insert.</p>}
        {notice ? <p role="status" className="text-sm">{notice}</p> : null}
        {tubeScan.error ? <Alert variant="destructive"><AlertTitle>Tube could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(tubeScan.error, 'Check the barcode and scan again.')}</AlertDescription></Alert> : null}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <caption className="sr-only">Expected tubes and their accession progress</caption>
          <thead><tr className="border-b">{['Customer sample ID', 'Tube barcode', 'Status', 'Freezer box'].map(label => <th key={label} scope="col" className="p-2 font-medium">{label}</th>)}</tr></thead>
          <tbody>{packet.crosswalk.map(row => {
            const container = containers.find(item => item.barcode === row.supplierTubeBarcode)
            return <tr key={row.tubeSlotId ?? row.shipmentItemId} className="border-b"><td className="p-2">{row.customerSampleId}<span className="block text-xs text-muted-foreground">{row.sampleName} · Tube {row.tubeOrdinal ?? 1} of {row.tubeCount ?? 1}</span></td><td className="p-2 font-mono">{row.supplierTubeBarcode ?? 'Missing assignment'}</td><td className="p-2">{container || row.tubeStatus === 'Accessioned' ? 'Accessioned' : 'Awaiting accession'}</td><td className="p-2 font-mono">{container?.location ?? '—'}</td></tr>
          })}</tbody>
        </table></div>
      </div>
      <DialogFooter><Button ref={doneButton} variant={allDone ? 'default' : 'outline'} disabled={tubeScan.isPending} onClick={onClose}>{allDone ? 'Done' : 'Close — continue later'}</Button></DialogFooter>
      {selectedTube ? <FreezerBoxDialog key={selectedTube.supplierTubeBarcode} tube={selectedTube} packet={packet} onClose={() => { setSelectedTube(null); focusTube() }} onSaved={async detail => {
        client.setQueryData(['lab-work-order', packet.labWorkOrderId], detail)
        setNotice(`Tube ${selectedTube.supplierTubeBarcode} accessioned. Scan the next tube.`)
        setSelectedTube(null)
        tubeScan.reset()
        focusTube()
        await Promise.all([
          client.invalidateQueries({ queryKey: ['lab-shipment-queue'] }),
          client.invalidateQueries({ queryKey: ['accession-packet', packet.barcode] }),
          client.invalidateQueries({ queryKey: ['lab-receipt-context'] }),
          client.invalidateQueries({ queryKey: ['lab-operations'] }),
        ])
      }} /> : null}
    </DialogContent>
  </Dialog>
}

function FreezerBoxDialog({ tube, packet, onClose, onSaved }: {
  tube: RegisteredSampleTubeScan
  packet: SampleShippingPacketScan
  onClose: () => void
  onSaved: (detail: Awaited<ReturnType<typeof accessionShipmentTube>>) => Promise<void>
}) {
  const [discard, setDiscard] = useState(false)
  const form = useForm<BoxForm>({ resolver: zodResolver(boxSchema), defaultValues: { freezerBoxBarcode: '' } })
  const save = useMutation({ mutationFn: (values: BoxForm) => accessionShipmentTube(packet.labWorkOrderId, packet.shipmentId, { packetBarcode: packet.barcode, supplierTubeBarcode: tube.supplierTubeBarcode, ...values }), retry: false, onSuccess: onSaved })
  const close = () => { if (!save.isPending) { if (form.formState.isDirty) setDiscard(true); else onClose() } }
  return <Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); form.setFocus('freezerBoxBarcode') }} onCloseAutoFocus={event => event.preventDefault()}>
      <DialogHeader><DialogTitle>Accession tube</DialogTitle><DialogDescription>Tube {tube.supplierTubeBarcode} · Customer sample {tube.customerSampleId}. Scan the freezer box where this tube will be stored.</DialogDescription></DialogHeader>
      <form id="freezer-box-form" onSubmit={form.handleSubmit(values => { if (!save.isPending) save.mutate(values) })} className="space-y-3">
        <Label htmlFor="freezer-box-barcode"><RequiredFieldName>Freezer box barcode</RequiredFieldName></Label>
        <Input id="freezer-box-barcode" {...form.register('freezerBoxBarcode')} className="font-mono" autoComplete="off" spellCheck={false} readOnly={save.isPending} aria-required="true" aria-invalid={Boolean(form.formState.errors.freezerBoxBarcode)} aria-describedby={form.formState.errors.freezerBoxBarcode ? 'freezer-box-error' : undefined} />
        {form.formState.errors.freezerBoxBarcode ? <p id="freezer-box-error" role="alert" className="text-sm text-destructive">{form.formState.errors.freezerBoxBarcode.message}</p> : null}
      </form>
      {save.error ? <Alert variant="destructive"><AlertTitle>Accession could not be confirmed</AlertTitle><AlertDescription>{getOrderErrorMessage(save.error, 'Check the connection and try again with the same freezer box barcode.')}</AlertDescription></Alert> : null}
      {discard ? <Alert><AlertTitle>Discard this freezer-box entry?</AlertTitle><AlertDescription>Previously saved tubes remain accessioned. Unsaved changes to this entry will be discarded.<div className="mt-2 flex gap-2"><Button variant="outline" onClick={() => setDiscard(false)}>Keep editing</Button><Button variant="outline" onClick={onClose}>Discard entry</Button></div></AlertDescription></Alert> : null}
      <RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>Cancel</Button><Button type="submit" form="freezer-box-form" disabled={save.isPending || discard}>{save.isPending ? 'Saving…' : 'Accession tube'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
