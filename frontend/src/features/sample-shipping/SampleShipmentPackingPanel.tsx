import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Package, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '#/api/organization-management'
import { confirmSampleShipmentPacking, getSampleShipmentPacking, previewSampleShipmentPacking, type SampleContainerQuantity, type SampleShipmentPacking, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { ContainerRecommendation } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const quantityLimit = 10000
const packingSchema = z.object({ rows: z.array(z.object({
  id: z.string(),
  quantity: z.coerce.number().int('Enter a whole number.').min(0, 'Enter zero or more.').max(quantityLimit),
  availability: z.string().trim().refine(value => value === '' || /^\d+$/.test(value) && Number(value) <= quantityLimit, 'Enter a whole number, or leave blank if unknown.'),
})), tubeCounts: z.record(z.string(), z.coerce.number().int('Enter a whole number of tubes.').min(0, 'Enter zero or more tubes.')) })
type PackingValues = z.output<typeof packingSchema>
type PackingInput = { selection: SampleContainerQuantity[]; availability?: SampleContainerQuantity[]; containerTubeCounts?: number[] }

export function SampleShipmentPackingPanel({ shipment, canManage }: { shipment: SampleShipmentWorkflow; canManage: boolean }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const query = useQuery({ queryKey: ['sample-shipment-packing', shipment.id], queryFn: () => getSampleShipmentPacking(shipment.id) })
  const recommendation = useQuery({ queryKey: ['sample-shipment-recommendation', shipment.id, query.data?.version], queryFn: () => previewSampleShipmentPacking(shipment.id, {}), enabled: Boolean(query.data?.canPack && query.data.containerTypes.length) })
  const confirm = useMutation({
    mutationFn: (input: PackingInput & { version: number }) => confirmSampleShipmentPacking(shipment.id, { version: input.version, containers: input.selection, availability: input.availability, containerTubeCounts: input.containerTubeCounts }),
    onSuccess: async shipments => {
      setOpen(false)
      for (const prepared of shipments) client.setQueryData(['sample-shipment', prepared.id], prepared)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['sample-shipment', shipment.id] }),
        client.invalidateQueries({ queryKey: ['sample-shipments'] }),
        client.invalidateQueries({ queryKey: ['sample-shipment-packing', shipment.id] }),
        client.invalidateQueries({ queryKey: ['lab-service-order', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['trial-project', shipment.authorizationSourceId] }),
      ])
      const first = shipments.find(item => !item.isPackingPool && item.crosswalk.length)
      if (first) await navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: first.id } })
    },
  })
  return <Card>
    <CardHeader><CardTitle>Choose shipping containers</CardTitle><CardDescription>Use compatible containers you actually have. Recommendations are optional; extra containers and spare slots are allowed.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {query.isPending ? <p role="status">Loading compatible containers…</p> : query.error || !query.data ? <Alert variant="destructive"><AlertTitle>Containers unavailable</AlertTitle><AlertDescription>{apiErrorMessage(query.error)} <Button variant="outline" onClick={() => void query.refetch()}>Retry containers</Button></AlertDescription></Alert>
        : !query.data.canPack ? <p className="text-sm text-muted-foreground">{query.data.blockedReason ?? 'This shipment cannot be repacked. Contact Phaeno for help with its current assignments.'}</p>
          : !query.data.containerTypes.length ? <p className="text-sm text-muted-foreground">No compatible container sizes are available. Contact Phaeno before packing these tubes.</p>
            : <>
              {recommendation.isPending ? <p role="status" className="text-sm">Preparing a recommendation…</p> : recommendation.error ? <Alert variant="destructive"><AlertTitle>Recommendation unavailable</AlertTitle><AlertDescription>{apiErrorMessage(recommendation.error)} <Button variant="outline" onClick={() => void recommendation.refetch()}>Retry recommendation</Button></AlertDescription></Alert> : recommendation.data ? <PackingSummary preview={recommendation.data} /> : null}
              <p className="text-xs text-muted-foreground">Available quantities are not known unless you enter them. This screen does not reserve inventory.</p>
              {canManage ? <Button variant="outline" onClick={() => { confirm.reset(); setOpen(true) }}><Settings2 data-icon="inline-start" />Adjust containers</Button> : <p className="text-sm text-muted-foreground">An authorized organization or Department administrator prepares the containers.</p>}
            </>}
    </CardContent>
    {open && query.data ? <PackingDialog packing={query.data} initial={recommendation.data} busy={confirm.isPending} error={confirm.error} onClose={() => setOpen(false)} onConfirm={input => confirm.mutate(input)} /> : null}
  </Card>
}

export function PackingDialog({ packing, initial, busy, error, onClose, onConfirm }: {
  packing: SampleShipmentPacking; initial?: ContainerRecommendation; busy: boolean; error: unknown
  onClose: () => void; onConfirm: (input: PackingInput & { version: number }) => void
}) {
  const [version] = useState(packing.version)
  const [openedPacking] = useState(packing)
  const [allocationPage, setAllocationPage] = useState(0)
  const initialRows = packing.containerTypes.map(type => ({ id: type.id, quantity: initial?.containers.find(item => item.containerDefinitionId === type.id)?.quantity ?? 0, availability: '' }))
  const form = useForm<z.input<typeof packingSchema>, unknown, PackingValues>({ resolver: zodResolver(packingSchema), defaultValues: { rows: initialRows, tubeCounts: defaultTubeCounts(initialRows, packing) } })
  const values = useWatch({ control: form.control })
  const parsed = packingSchema.safeParse(values)
  const inputSignature = parsed.success ? JSON.stringify(toPackingInput(parsed.data)) : null
  const validRows = packingSchema.shape.rows.safeParse(values.rows)
  const selectionSignature = validRows.success ? JSON.stringify(validRows.data.map(row => ({ id: row.id, quantity: row.quantity }))) : null
  useEffect(() => { if (selectionSignature) { form.setValue('tubeCounts', defaultTubeCounts(JSON.parse(selectionSignature) as Array<{ id: string; quantity: number }>, openedPacking)); form.clearErrors('root.allocation') } }, [form, openedPacking, selectionSignature])
  const physicalContainers = validRows.success ? expandContainers(validRows.data, packing) : []
  const allocationPages = Math.max(1, Math.ceil(physicalContainers.length / 12))
  const visibleAllocationPage = Math.min(allocationPage, allocationPages - 1)
  const [previewSignature, setPreviewSignature] = useState(inputSignature)
  useEffect(() => { const timeout = window.setTimeout(() => setPreviewSignature(inputSignature), 250); return () => window.clearTimeout(timeout) }, [inputSignature])
  const preview = useQuery({ queryKey: ['sample-packing-preview', packing.shipmentId, previewSignature], queryFn: () => previewSampleShipmentPacking(packing.shipmentId, JSON.parse(previewSignature!) as PackingInput), enabled: Boolean(previewSignature) && packing.canPack })
  const suggest = useMutation({ mutationFn: (availability?: SampleContainerQuantity[]) => previewSampleShipmentPacking(packing.shipmentId, { availability }), onSuccess: result => { for (const [index, type] of packing.containerTypes.entries()) form.setValue(`rows.${index}.quantity`, result.containers.find(item => item.containerDefinitionId === type.id)?.quantity ?? 0, { shouldDirty: true }) } })
  const isDirty = form.formState.isDirty
  const working = busy || suggest.isPending
  const currentPreview = previewSignature === inputSignature && !preview.isFetching && !preview.error ? preview.data : undefined
  const close = () => { if (!working && (!isDirty || window.confirm('Discard the unsaved container selection?'))) onClose() }
  const submit = form.handleSubmit(data => {
    if (working || !currentPreview?.containerCount || !packing.canPack) return
    form.clearErrors('root.allocation')
    const counts = physicalContainers.map(item => data.tubeCounts[item.key])
    const invalid = physicalContainers.findIndex((item, index) => counts[index] > item.capacity)
    if (invalid >= 0) { setAllocationPage(Math.floor(invalid / 12)); form.setError(`tubeCounts.${physicalContainers[invalid].key}`, { message: `This container holds at most ${physicalContainers[invalid].capacity} tubes.` }, { shouldFocus: true }); return }
    const expected = currentPreview.tubeCount - currentPreview.unallocatedTubes
    if (counts.reduce((sum, count) => sum + count, 0) !== expected) { form.setError('root.allocation', { message: `Assign exactly ${expected} tubes across these containers. Tubes without a container remain unallocated.` }); return }
    onConfirm({ ...toPackingInput(data), containerTubeCounts: counts, version })
  })
  return <Dialog open onOpenChange={next => { if (!next) close() }}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Adjust containers</DialogTitle><DialogDescription>Select the sizes and quantities you will use for {packing.tubeCount} tubes. Empty containers will not become shipments.</DialogDescription></DialogHeader>
      {error || suggest.error ? <Alert variant="destructive"><AlertTitle>Containers were not confirmed</AlertTitle><AlertDescription>{apiErrorMessage(error ?? suggest.error)}</AlertDescription></Alert> : null}
      <form id="sample-packing" noValidate className="space-y-5" onSubmit={submit}>
        <div className="space-y-4">{packing.containerTypes.map((type, index) => <fieldset key={type.id} className="rounded-md border p-3"><legend className="px-1 text-sm font-semibold">{type.commonName}</legend><p className="mb-3 text-xs text-muted-foreground">SKU {type.sku} · {type.tubeCapacity} tubes per container</p><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`selected-${type.id}`}><RequiredFieldName>Containers to use</RequiredFieldName></Label><Input id={`selected-${type.id}`} type="number" min="0" step="1" disabled={working} aria-invalid={Boolean(form.formState.errors.rows?.[index]?.quantity)} {...form.register(`rows.${index}.quantity`)} />{form.formState.errors.rows?.[index]?.quantity ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.rows[index]?.quantity?.message}</p> : null}</div><div className="space-y-1.5"><Label htmlFor={`available-${type.id}`}>Available to you (optional)</Label><Input id={`available-${type.id}`} type="number" min="0" step="1" placeholder="Unknown" disabled={working} aria-invalid={Boolean(form.formState.errors.rows?.[index]?.availability)} {...form.register(`rows.${index}.availability`)} />{form.formState.errors.rows?.[index]?.availability ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.rows[index]?.availability?.message}</p> : null}</div></div>{type.packingInstructions ? <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{type.packingInstructions}</p> : null}</fieldset>)}</div>
        <p className="text-xs text-muted-foreground">Enter zero to exclude a size. Available quantities are limits for this dispatch; leave blank when unknown.</p>
        <Button type="button" variant="outline" disabled={working} onClick={() => void form.handleSubmit(data => suggest.mutate(toPackingInput(data).availability))()}>{suggest.isPending ? 'Recommending…' : 'Use recommendation for these quantities'}</Button>
        {preview.error ? <Alert variant="destructive"><AlertTitle>Review container selection</AlertTitle><AlertDescription>{apiErrorMessage(preview.error)} <Button type="button" variant="outline" onClick={() => void preview.refetch()}>Retry preview</Button></AlertDescription></Alert> : !currentPreview ? <p role="status" className="text-sm">{inputSignature ? 'Updating allocation preview…' : 'Review the quantities to see the allocation preview.'}</p> : <PackingSummary preview={currentPreview} />}
        {currentPreview && currentPreview.containerCount === 0 ? <p className="text-sm text-muted-foreground">Choose at least one compatible container to prepare a shipment.</p> : null}
        {physicalContainers.length ? <section className="space-y-3" aria-label="Tube allocation"><h3 className="font-semibold">Tubes in each container</h3><p className="text-xs text-muted-foreground">Adjust the distribution as needed. Zero leaves a selected container empty and does not create a shipment.</p><div className="grid gap-3 sm:grid-cols-2">{physicalContainers.slice(visibleAllocationPage * 12, (visibleAllocationPage + 1) * 12).map(item => <div key={item.key} className="space-y-1.5 rounded-md border p-3"><Label htmlFor={`tubes-${item.key}`}><RequiredFieldName>Tubes to pack · {item.name} #{item.ordinal}</RequiredFieldName></Label><p className="text-xs text-muted-foreground">SKU {item.sku} · Capacity {item.capacity}</p><Input id={`tubes-${item.key}`} type="number" min="0" max={item.capacity} step="1" disabled={working} onFocus={event => event.currentTarget.scrollIntoView?.({ block: 'center', inline: 'nearest' })} aria-invalid={Boolean(form.formState.errors.tubeCounts?.[item.key])} aria-describedby={form.formState.errors.tubeCounts?.[item.key] ? `tubes-${item.key}-error` : undefined} {...form.register(`tubeCounts.${item.key}`)} />{form.formState.errors.tubeCounts?.[item.key] ? <p id={`tubes-${item.key}-error`} role="alert" className="text-sm text-destructive">{form.formState.errors.tubeCounts[item.key]?.message}</p> : null}</div>)}</div>{allocationPages > 1 ? <div className="flex items-center justify-between gap-2"><Button type="button" variant="outline" disabled={visibleAllocationPage === 0 || working} onClick={() => setAllocationPage(visibleAllocationPage - 1)}>Previous containers</Button><span className="text-xs">Page {visibleAllocationPage + 1} of {allocationPages}</span><Button type="button" variant="outline" disabled={visibleAllocationPage === allocationPages - 1 || working} onClick={() => setAllocationPage(visibleAllocationPage + 1)}>Next containers</Button></div> : null}{form.formState.errors.root?.allocation ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.allocation.message}</p> : null}</section> : null}
        {currentPreview && currentPreview.unallocatedTubes > 0 ? <p className="text-sm">{currentPreview.unallocatedTubes} tubes still need a container. You can prepare the allocated tubes now; the remaining tubes stay visible on the Job.</p> : null}
      </form>
      <RequiredDialogFooter><Button variant="outline" disabled={working} onClick={close}>Keep reviewing</Button><Button type="submit" form="sample-packing" disabled={working || !packing.canPack || parsed.success && !currentPreview?.containerCount}>{busy ? 'Confirming…' : currentPreview && !currentPreview.isComplete ? 'Prepare available containers' : 'Confirm containers'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

export function PackingSummary({ preview }: { preview: ContainerRecommendation }) {
  return <div className="space-y-3">
    <p className="text-sm">{preview.explanation}</p>
    <ul className="space-y-2">{preview.containers.map(item => <li key={item.containerDefinitionId} className="flex items-start gap-2 text-sm"><Package aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong>{item.quantity} × {item.commonName}</strong> · SKU {item.sku}<br /><span className="text-muted-foreground">{item.capacity} tubes per container · {item.assignedTubes} tubes allocated · {item.unusedCapacity} spare slots</span></span></li>)}</ul>
    <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-3">{[['Tubes', preview.tubeCount], ['Containers', preview.containerCount], ['Usable capacity', preview.totalCapacity], ['Spare slots', preview.unusedCapacity], ['Unallocated tubes', preview.unallocatedTubes]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
  </div>
}

function toPackingInput(values: PackingValues): PackingInput {
  const availability = values.rows.filter(row => row.availability !== '').map(row => ({ containerDefinitionId: row.id, quantity: Number(row.availability) }))
  return { selection: values.rows.filter(row => row.quantity > 0).map(row => ({ containerDefinitionId: row.id, quantity: row.quantity })), ...(availability.length ? { availability } : {}) }
}

function expandContainers(rows: Array<{ id: string; quantity: number }>, packing: SampleShipmentPacking) {
  return rows.flatMap(row => { const type = packing.containerTypes.find(item => item.id === row.id); return type ? Array.from({ length: row.quantity }, (_, index) => ({ key: `${type.id}-${index}`, name: type.commonName, sku: type.sku, capacity: type.tubeCapacity, ordinal: index + 1 })) : [] })
}
function defaultTubeCounts(rows: Array<{ id: string; quantity: number }>, packing: SampleShipmentPacking) {
  let remaining = packing.tubeCount
  return Object.fromEntries(expandContainers(rows, packing).map(item => { const count = Math.min(remaining, item.capacity); remaining -= count; return [item.key, count] }))
}
