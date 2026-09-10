import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { CheckCircle2, ScanBarcode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { SampleShipmentWorkflow, SampleShippingCrosswalkItem } from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { ShippingBarcode } from './ShippingBarcode'

const scanSchema = z.object({ barcode: z.string().trim().min(4, 'Scan or enter the complete tube barcode.').max(100) })
type ScanValues = z.infer<typeof scanSchema>
const pageSize = 8

export function SampleTubeScanner({ shipment, canManage, requiresAssignedContainer = false, writesBlocked = false, onAssign, onCorrect, onScanActivityChange }: {
  shipment: SampleShipmentWorkflow
  canManage: boolean
  requiresAssignedContainer?: boolean
  writesBlocked?: boolean
  onAssign: (item: SampleShippingCrosswalkItem, barcode: string) => Promise<SampleShipmentWorkflow>
  onCorrect: (item: SampleShippingCrosswalkItem) => void
  onScanActivityChange?: (active: boolean) => void
}) {
  const form = useForm<ScanValues>({ resolver: zodResolver(scanSchema), defaultValues: { barcode: '' } })
  const [page, setPage] = useState(() => Math.floor(Math.max(0, shipment.crosswalk.findIndex(item => !item.supplierTubeBarcode)) / pageSize))
  const [lastSaved, setLastSaved] = useState<{ sample: string; barcode: string } | null>(null)
  const [activeKey, setActiveKey] = useState(() => slotKey(shipment.crosswalk.find(item => !item.supplierTubeBarcode)))
  const lastFocusedSlot = useRef<string | null>(null)
  const current = shipment.crosswalk.find(item => slotKey(item) === activeKey)
  const nextUnmatched = shipment.crosswalk.find(item => !item.supplierTubeBarcode)
  const currentKey = slotKey(current)
  const matched = shipment.crosswalk.filter(item => item.supplierTubeBarcode).length
  const canUseTubes = requiresAssignedContainer ? Boolean(shipment.assignedContainer) : Boolean(shipment.container) || shipment.returnKit?.status === 'Fulfilled'
  const canScan = canManage && shipment.status === 'Preparing' && canUseTubes && !shipment.isPackingPool
  const mutation = useMutation({
    mutationFn: ({ item, barcode }: { item: SampleShippingCrosswalkItem; barcode: string }) => onAssign(item, barcode),
    onSuccess: (saved, { item, barcode }) => {
      const updated = saved.crosswalk.find(row => (row.tubeSlotId ?? row.shipmentItemId) === (item.tubeSlotId ?? item.shipmentItemId))
      setLastSaved({ sample: item.customerSampleId, barcode: updated?.supplierTubeBarcode ?? barcode })
      form.reset({ barcode: '' })
      const next = saved.crosswalk.findIndex(row => !row.supplierTubeBarcode)
      setActiveKey(slotKey(saved.crosswalk[next]))
      if (next >= 0) setPage(Math.floor(next / pageSize))
    },
  })
  const isDirty = form.formState.isDirty
  useEffect(() => {
    onScanActivityChange?.(isDirty || mutation.isPending)
    return () => onScanActivityChange?.(false)
  }, [isDirty, mutation.isPending, onScanActivityChange])
  useBlocker({ shouldBlockFn: () => mutation.isPending || isDirty && !window.confirm('Discard the unsaved tube scan?'), enableBeforeUnload: () => mutation.isPending || isDirty, disabled: !mutation.isPending && !isDirty })
  useEffect(() => {
    if (canScan && currentKey && !mutation.isPending && (lastFocusedSlot.current !== currentKey || mutation.error)) {
      const timeout = window.setTimeout(() => { lastFocusedSlot.current = currentKey; form.setFocus('barcode') }, 0)
      return () => window.clearTimeout(timeout)
    }
  }, [canScan, currentKey, form, mutation.error, mutation.isPending])
  const pageCount = Math.max(1, Math.ceil(shipment.crosswalk.length / pageSize))
  const visiblePage = Math.min(page, pageCount - 1)
  const rows = shipment.crosswalk.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize)

  return <Card>
    <CardHeader><CardTitle>Scan tubes into this shipment</CardTitle><CardDescription>Work down the sample list. Scan each permanent tube barcode; each match is saved before the next tube.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <p role="status" className="text-sm font-medium">{matched} of {shipment.crosswalk.length} tubes matched</p>
      <div role="progressbar" aria-label="Tubes matched in this shipment" aria-valuenow={matched} aria-valuemin={0} aria-valuemax={Math.max(1, shipment.crosswalk.length)} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${matched / Math.max(1, shipment.crosswalk.length) * 100}%` }} /></div>
      {canScan && nextUnmatched && (!current || current.supplierTubeBarcode) ? <Alert><AlertTitle>Review the updated tube list</AlertTitle><AlertDescription>The active tube row changed. The saved assignments remain below; review them before continuing. <Button variant="outline" disabled={mutation.isPending} onClick={() => { if (!isDirty || window.confirm('Discard the unsaved tube scan and continue to the next unmatched tube?')) { form.reset({ barcode: '' }); mutation.reset(); setActiveKey(slotKey(nextUnmatched)) } }}>Continue scanning</Button></AlertDescription></Alert> : null}
      {writesBlocked ? <p role="status" className="text-sm text-muted-foreground">Saving is unavailable until current container information is verified. Your scan is retained.</p> : null}
      {shipment.assignedContainer ? <p className="text-sm wrap-anywhere">Container <strong>{shipment.assignedContainer.kitNumber}</strong> · Scan only its registered tubes.</p> : null}
      {canScan && current && !current.supplierTubeBarcode ? <form noValidate className="space-y-3 rounded-md border bg-muted/30 p-4" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && !writesBlocked) mutation.mutate({ item: current, barcode: values.barcode }) })}>
        <div><h3 className="wrap-anywhere font-semibold">{current.customerSampleId}</h3><p className="text-sm text-muted-foreground">Tube {current.tubeOrdinal ?? 1} of {current.totalSampleTubeCount ?? current.tubeCount ?? 1} · {current.sampleName}</p></div>
        <div className="space-y-1.5"><Label htmlFor="active-tube-barcode"><RequiredFieldName>Scan tube barcode</RequiredFieldName></Label><div className="flex flex-wrap items-start gap-2"><Input id="active-tube-barcode" className="min-w-40 flex-1 font-mono" autoComplete="off" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.barcode)} aria-describedby={form.formState.errors.barcode ? 'tube-scan-error' : undefined} {...form.register('barcode')} /><Button type="submit" disabled={mutation.isPending || writesBlocked}><ScanBarcode data-icon="inline-start" />{mutation.isPending ? 'Saving scan…' : 'Save scan'}</Button></div>{form.formState.errors.barcode ? <p id="tube-scan-error" role="alert" className="text-sm text-destructive">{form.formState.errors.barcode.message}</p> : null}</div>
        <p className="text-xs text-muted-foreground"><span aria-hidden="true" className="text-destructive">*</span> Required · Enter saves the scan. You can leave and resume from the next unmatched tube.</p>
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Tube was not matched</AlertTitle><AlertDescription>{apiErrorMessage(mutation.error)} Review the barcode and try again.</AlertDescription></Alert> : null}
      </form> : canScan && !nextUnmatched ? <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 aria-hidden="true" className="size-4 text-primary" />Every declared tube is matched. Review the contents and confirm the shipping insert.</p> : <p className="text-sm text-muted-foreground">{shipment.isPackingPool ? 'Choose containers before scanning tubes.' : !canUseTubes ? requiresAssignedContainer ? 'Confirm a received container before scanning its tubes.' : 'Scanning becomes available after Phaeno registers and fulfills the return kit.' : 'The saved tube assignments are shown below.'}</p>}
      <p role="status" aria-atomic="true" className="sr-only">{lastSaved ? `Saved ${lastSaved.barcode} for ${lastSaved.sample}.` : ''}</p>
      <div className="max-h-[32rem] overflow-y-auto rounded-md border">
        <ul className="divide-y">{rows.map(item => <li key={item.tubeSlotId ?? item.shipmentItemId} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_auto] sm:items-center">
          <div className="min-w-0"><p className="wrap-anywhere text-sm font-medium">{item.customerSampleId}</p><p className="text-xs text-muted-foreground">Tube {item.tubeOrdinal ?? 1} of {item.totalSampleTubeCount ?? item.tubeCount ?? 1}</p></div>
          {item.supplierTubeBarcode ? <div className="max-w-48 print:max-w-none [&_svg]:h-4 print:[&_svg]:h-[7mm]"><ShippingBarcode value={item.supplierTubeBarcode} label="Tube barcode" /></div> : <p className="text-sm text-muted-foreground">Not matched</p>}
          {canManage && item.supplierTubeBarcode && (shipment.status === 'Preparing' || shipment.status === 'ReadyToShip') && canUseTubes ? <Button size="sm" variant="outline" disabled={mutation.isPending || writesBlocked} onClick={() => onCorrect(item)}>{shipment.currentPacket ? 'Correct tube' : 'Change tube'}</Button> : null}
        </li>)}</ul>
      </div>
      {pageCount > 1 ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Tubes {visiblePage * pageSize + 1}–{Math.min((visiblePage + 1) * pageSize, shipment.crosswalk.length)} of {shipment.crosswalk.length}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={visiblePage === 0 || mutation.isPending} onClick={() => setPage(visiblePage - 1)}>Previous tubes</Button><Button variant="outline" size="sm" disabled={visiblePage === pageCount - 1 || mutation.isPending} onClick={() => setPage(visiblePage + 1)}>Next tubes</Button></div></div> : null}
    </CardContent>
  </Card>
}

function slotKey(item?: SampleShippingCrosswalkItem) { return item?.tubeSlotId ?? item?.shipmentItemId ?? null }

