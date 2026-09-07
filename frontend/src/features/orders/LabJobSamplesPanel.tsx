import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { confirmLabSampleImport, deleteLabSample, downloadLabSampleTemplate, finalizeLabSampleRoster, getOrderErrorMessage, previewLabSampleImport, type LabSample, type LabSampleImportPreview, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabSampleDialog } from './LabSampleDialog'
import { OrderStatusBadge } from './OrderStatusBadge'
import { RelatedSampleShipments } from '#/features/sample-shipping/RelatedSampleShipments'

export function LabJobSamplesPanel({ order }: { order: LabServiceOrder }) {
  const cache = useQueryClient()
  const [sample, setSample] = useState<LabSample | null | undefined>(undefined)
  const [confirm, setConfirm] = useState<'import' | 'finalize' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ value: LabSampleImportPreview; version: number } | null>(null)
  const [confirmedVersion, setConfirmedVersion] = useState<number | null>(null)
  const refresh = async (saved?: LabServiceOrder) => {
    if (saved) cache.setQueryData(['lab-service-order', order.id], saved)
    await Promise.all(['lab-service-order', 'lab-service-orders', 'sample-shipments'].map(key => cache.invalidateQueries({ queryKey: [key] })))
  }
  const change = useMutation({
    mutationFn: async (action: { kind: 'remove'; sample: LabSample } | { kind: 'finalize' } | { kind: 'import' }) => {
      if (action.kind === 'remove') return deleteLabSample(order.id, action.sample.id, action.sample.version)
      if (action.kind === 'finalize') return finalizeLabSampleRoster(order.id, order.version)
      if (!preview || preview.version !== order.version) throw new Error('The Job changed. Preview the file again before replacing the list.')
      return confirmLabSampleImport(order.id, preview.value.previewId, preview.version)
    },
    onSuccess: async saved => { setConfirm(null); setPreview(null); setFile(null); setConfirmedVersion(null); await refresh(saved) },
    onError: () => refresh(),
  })
  const upload = useMutation({
    mutationFn: async () => {
      const version = order.version
      return { value: await previewLabSampleImport(order.id, file!, version), version }
    },
    onSuccess: value => setPreview(value),
  })
  const template = useMutation({ mutationFn: () => downloadLabSampleTemplate(order.id, order.orderNumber) })
  const legacyCleanup = order.canEdit && !order.placedAt && order.samples.length > 0
  const failure = change.error ?? upload.error ?? template.error
  return <Card id="samples-and-shipping">
    <CardHeader><CardTitle>Samples and shipping</CardTitle><CardDescription>{order.sampleRosterFinalizedAt ? 'The finalized sample list authorizes laboratory work. Record shipping through its return kit and packet.' : order.canEditSamples ? 'Enter exactly the accepted sample count and biological-source composition, then finalize the list before shipping.' : 'Accept the quote before entering the individual sample list. Shipping and laboratory work require finalization.'}</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">{order.samples.length} of {order.requestedSpecimenCount} samples entered{order.sampleRosterFinalizedAt ? ' · Finalized' : ''}</p>
      <ul className="text-sm text-muted-foreground">{order.sourceGroups.map(group => <li key={group.id}>{group.biologicalSource}: {order.samples.filter(value => value.biologicalSource.toLocaleLowerCase() === group.biologicalSource.toLocaleLowerCase()).length} of {group.specimenCount}</li>)}</ul>
      {failure ? <Alert variant="destructive"><AlertTitle>Sample list was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(failure, 'Review the current Job and try again.')}</AlertDescription></Alert> : null}
      {legacyCleanup ? <Alert><AlertTitle>Legacy draft samples</AlertTitle><AlertDescription>Remove these earlier sample rows before submitting for pricing. Enter the current list after accepting the quote.</AlertDescription></Alert> : null}
      {order.canEditSamples ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={change.isPending || order.samples.length >= order.requestedSpecimenCount} onClick={() => setSample(null)}>Add sample</Button><Button variant="outline" disabled={template.isPending} onClick={() => template.mutate()}>Download CSV template</Button><Button variant="outline" onClick={() => { setConfirm('import'); setPreview(null); setFile(null) }}>Import sample list</Button>{order.canFinalizeSamples ? <Button onClick={() => { setConfirm('finalize'); setConfirmedVersion(null) }}>Review and finalize list</Button> : null}</div> : null}
      <ul className="divide-y">{order.samples.map(value => <li key={value.id} className="space-y-2 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{value.customerSampleId}</span><OrderStatusBadge status={value.status} /></div><p className="text-sm">{value.biologicalSource} · {value.quantity} tubes{value.accessionId ? ` · Accession ${value.accessionId}` : ''}</p>{value.tenantSafeReason ? <p className="text-sm">{value.tenantSafeReason}</p> : null}{order.canEditSamples || legacyCleanup ? <div className="flex gap-2">{order.canEditSamples ? <Button size="sm" variant="outline" onClick={() => setSample(value)}>Edit sample</Button> : null}<Button size="sm" variant="outline" disabled={change.isPending} onClick={() => { if (window.confirm(`Remove ${value.customerSampleId} from this sample list?`)) change.mutate({ kind: 'remove', sample: value }) }}>Remove sample</Button></div> : null}</li>)}</ul>
      <RelatedSampleShipments sourceId={order.id} />
      {sample !== undefined ? <LabSampleDialog open order={order} sample={sample} onOpenChange={open => { if (!open) setSample(undefined) }} onSaved={async saved => { setSample(undefined); await refresh(saved) }} /> : null}
      <Dialog open={confirm !== null} onOpenChange={open => { if (!open && !change.isPending && !upload.isPending) setConfirm(null) }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{confirm === 'import' ? 'Import sample list' : 'Finalize sample list'}</DialogTitle><DialogDescription>{confirm === 'import' ? 'Preview the Job-specific CSV. Confirming replaces the editable sample list as one operation; previewing makes no changes.' : `Review all ${order.requestedSpecimenCount} samples and source counts. Finalization locks this list and authorizes the laboratory and registered return kit.`}</DialogDescription></DialogHeader>
        {failure ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(failure, 'Review the current Job and try again.')}</AlertDescription></Alert> : null}
        {confirm === 'import' ? <div className="space-y-3"><Label htmlFor="sample-roster-csv"><RequiredFieldName>Sample CSV</RequiredFieldName></Label><Input id="sample-roster-csv" type="file" accept=".csv,text/csv" disabled={upload.isPending || change.isPending} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); upload.reset() }} /><Button variant="outline" disabled={!file || upload.isPending || change.isPending} onClick={() => upload.mutate()}>Preview CSV</Button>{preview ? <><p>{preview.value.validRowCount} valid samples · {preview.value.blankRowCount} blank rows</p>{preview.version !== order.version ? <p role="alert">The Job changed. Preview the CSV again.</p> : null}{preview.value.errors.length ? <ul role="alert" className="text-sm text-destructive">{preview.value.errors.map((error, index) => <li key={index}>Row {error.rowNumber}, {error.column}: {error.message}</li>)}</ul> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Sample ID</th><th>Biological source</th><th>Tubes</th></tr></thead><tbody>{preview.value.rows.map(row => <tr key={row.rowNumber}><td>{row.customerSampleId}</td><td>{row.biologicalSource}</td><td>{row.tubeCount}</td></tr>)}</tbody></table></div>}</> : null}</div>
          : <div className="space-y-3"><ul className="text-sm">{order.samples.map(value => <li key={value.id}>{value.customerSampleId} · {value.biologicalSource} · {value.quantity} tubes</li>)}</ul><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmedVersion === order.version} disabled={change.isPending} onChange={event => setConfirmedVersion(event.target.checked ? order.version : null)} className="mt-1" /><RequiredFieldName>I confirm this exact sample list contains no patient identifiers or PHI.</RequiredFieldName></label></div>}
        <RequiredDialogFooter><Button variant="outline" disabled={change.isPending || upload.isPending} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={change.isPending || upload.isPending || (confirm === 'import' ? !preview || preview.version !== order.version || preview.value.errors.length > 0 || !preview.value.validRowCount : confirmedVersion !== order.version || !order.canFinalizeSamples)} onClick={() => change.mutate({ kind: confirm === 'import' ? 'import' : 'finalize' })}>{change.isPending ? 'Saving…' : confirm === 'import' ? 'Replace draft sample list' : 'Finalize sample list'}</Button></RequiredDialogFooter>
      </DialogContent></Dialog>
    </CardContent>
  </Card>
}
