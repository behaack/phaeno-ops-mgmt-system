import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { Package, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '#/api/organization-management'
import { previewSampleShipmentPacking, type SampleContainerQuantity, type SampleShipmentPacking } from '#/api/sample-shipping'
import type { ContainerRecommendation } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const quantityLimit = 10000
const pageSize = 12
const packingSchema = z.object({
  containers: z.array(z.object({
    definitionId: z.string().min(1, 'Choose a container size.'),
    containerBarcode: z.string().optional(),
    tubes: z.coerce.number().int('Enter a whole number of tubes.').min(0, 'Enter zero or more tubes.'),
  })).max(quantityLimit, 'Select no more than 10,000 containers.'),
})
type PackingValues = z.output<typeof packingSchema>
export type PackingInput = { selection: SampleContainerQuantity[]; availability?: SampleContainerQuantity[]; containerTubeCounts?: number[]; deliveryLocationId?: string; stockKits?: { stockKitId: string; version: number }[] }

export function PackingDialog({ packing, initial, availableKits, locationInventory = false, writesBlocked = false, busy, error, onClose, onConfirm }: {
  packing: SampleShipmentPacking; initial?: ContainerRecommendation; availableKits?: SampleContainerQuantity[]; busy: boolean; error: unknown
  locationInventory?: boolean; writesBlocked?: boolean
  onClose: () => void; onConfirm: (input: PackingInput & { version: number }) => void
}) {
  const [openedPacking] = useState(packing)
  const [page, setPage] = useState(0)
  const addButton = useRef<HTMLButtonElement>(null)
  const form = useForm<z.input<typeof packingSchema>, unknown, PackingValues>({
    resolver: zodResolver(packingSchema),
    defaultValues: {
      containers: recommendationRows(initial, openedPacking, availableKits),
    },
  })
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'containers' })
  const values = useWatch({ control: form.control })
  const parsed = packingSchema.safeParse(values)
  const inputSignature = parsed.success ? JSON.stringify(toPackingInput(parsed.data)) : null
  const [previewSignature, setPreviewSignature] = useState(inputSignature)
  useEffect(() => { const timeout = window.setTimeout(() => setPreviewSignature(inputSignature), 250); return () => window.clearTimeout(timeout) }, [inputSignature])
  const supplySignature = JSON.stringify(availableKits ?? null)
  const preview = useQuery({ queryKey: ['sample-packing-preview', packing.shipmentId, previewSignature, supplySignature, openedPacking.deliveryLocationId], queryFn: () => previewSampleShipmentPacking(packing.shipmentId, { ...JSON.parse(previewSignature!) as PackingInput, ...(openedPacking.deliveryLocationId ? { deliveryLocationId: openedPacking.deliveryLocationId } : {}) }), enabled: Boolean(previewSignature) && packing.canPack && !writesBlocked, placeholderData: keepPreviousData })
  const suggest = useMutation({
    mutationFn: () => previewSampleShipmentPacking(packing.shipmentId, { ...(openedPacking.deliveryLocationId ? { deliveryLocationId: openedPacking.deliveryLocationId } : {}) }),
    onSuccess: result => { replace(recommendationRows(result, openedPacking, availableKits)); form.clearErrors(); setPage(0) },
  })
  const isDirty = form.formState.isDirty
  const working = busy || suggest.isPending
  const currentPreview = previewSignature === inputSignature && !preview.isFetching && !preview.isPlaceholderData && !preview.error ? preview.data : undefined
  const pages = Math.max(1, Math.ceil(fields.length / pageSize))
  const visiblePage = Math.min(page, pages - 1)
  const close = () => { if (!working && (!isDirty || window.confirm('Discard the unsaved container selection?'))) onClose() }
  useBlocker({ shouldBlockFn: () => working || isDirty && !window.confirm('Discard the unsaved container selection?'), enableBeforeUnload: working || isDirty })
  const capacityNeeded = (rows: Array<{ definitionId?: string }>, excludedIndex?: number) => Math.max(0, openedPacking.tubeCount - rows.reduce((sum, row, index) => sum + (index === excludedIndex ? 0 : openedPacking.containerTypes.find(type => type.id === row.definitionId)?.tubeCapacity ?? 0), 0))
  const additionalCapacityNeeded = capacityNeeded(values.containers ?? [])
  const optionsFor = (rows: Array<{ definitionId?: string }>, index?: number) => containerOptions(openedPacking, rows, index, availableKits)
  const unavailableSelection = availableKits !== undefined && (values.containers ?? []).some(row => !row?.definitionId || (values.containers ?? []).filter(item => item?.definitionId === row.definitionId).length > (availableKits.find(item => item.containerDefinitionId === row.definitionId)?.quantity ?? 0))
  const draftTotals = (values.containers ?? []).reduce((totals, row) => {
    const capacity = openedPacking.containerTypes.find(type => type.id === row?.definitionId)?.tubeCapacity ?? 0
    const tubes = Number(row?.tubes)
    return { capacity: totals.capacity + capacity, assigned: totals.assigned + (Number.isFinite(tubes) ? Math.max(0, tubes) : 0) }
  }, { capacity: 0, assigned: 0 })
  const remainingExcept = (excludedIndex?: number) => Math.max(0, openedPacking.tubeCount - form.getValues('containers').reduce((sum, row, index) => {
    const count = Number(row.tubes)
    return sum + (index !== excludedIndex && Number.isFinite(count) && count > 0 ? count : 0)
  }, 0))
  const addContainer = () => {
    const needed = capacityNeeded(form.getValues('containers'))
    const options = optionsFor(form.getValues('containers'))
    const type = options.find(type => type.tubeCapacity >= needed) ?? options.at(-1)
    if (working || !type || fields.length >= quantityLimit) return
    setPage(Math.floor(fields.length / pageSize))
    append({ definitionId: type.id, tubes: Math.min(type.tubeCapacity, remainingExcept()), containerBarcode: '' }, { focusName: `containers.${fields.length}.${locationInventory ? 'containerBarcode' : 'definitionId'}` })
    form.clearErrors('root.allocation')
  }
  const removeContainer = (index: number) => {
    if (working) return
    const nextIndex = Math.min(index, fields.length - 2)
    remove(index)
    setPage(Math.max(0, Math.floor(nextIndex / pageSize)))
    form.clearErrors('root.allocation')
    window.requestAnimationFrame(() => { if (nextIndex >= 0) form.setFocus(`containers.${nextIndex}.definitionId`); else addButton.current?.focus() })
  }
  const changeSize = (index: number, definitionId: string) => {
    const type = optionsFor(form.getValues('containers'), index).find(item => item.id === definitionId)
    if (!type || working) return
    form.setValue(`containers.${index}.tubes`, Math.min(type.tubeCapacity, remainingExcept(index)), { shouldDirty: true })
    form.setValue(`containers.${index}.containerBarcode`, '', { shouldDirty: true })
    form.clearErrors(`containers.${index}.tubes`)
    form.clearErrors('root.allocation')
  }
  const focusTubes = (index: number) => {
    setPage(Math.floor(index / pageSize))
    window.requestAnimationFrame(() => form.setFocus(`containers.${index}.tubes`))
  }
  const resolveBarcode = (index: number, adjustSize = false) => {
    const row = form.getValues(`containers.${index}`)
    const barcode = (row.containerBarcode ?? '').trim().toUpperCase()
    const kit = packing.availableKits?.find(item => item.kitNumber.trim().toUpperCase() === barcode && item.status === 'Available')
    let message = !barcode ? 'Scan the barcode on this physical container.' : !kit ? 'This container is not available at the selected location. Check its barcode, receipt and assignment.' : undefined
    if (kit && form.getValues('containers').some((other, otherIndex) => otherIndex !== index && (other.containerBarcode ?? '').trim().toUpperCase() === barcode && Number(other.tubes) > 0)) message = 'This container is already selected in another row.'
    if (kit && kit.container.definitionId !== row.definitionId) {
      if (adjustSize && optionsFor(form.getValues('containers'), index).some(type => type.id === kit.container.definitionId)) {
        form.setValue(`containers.${index}.definitionId`, kit.container.definitionId, { shouldDirty: true })
        form.setValue(`containers.${index}.tubes`, Math.min(kit.container.capacity, remainingExcept(index)), { shouldDirty: true })
      } else message = 'This barcode belongs to a different container size. Select a suitable size or scan the matching container.'
    }
    if (message) { form.setError(`containers.${index}.containerBarcode`, { message }); return undefined }
    form.setValue(`containers.${index}.containerBarcode`, barcode, { shouldDirty: true })
    form.clearErrors(`containers.${index}.containerBarcode`)
    return kit
  }
  const submit = form.handleSubmit(data => {
    if (working || writesBlocked || !currentPreview?.containerCount || !packing.canPack || unavailableSelection) return
    form.clearErrors('root.allocation')
    for (const [index, row] of data.containers.entries()) {
      const type = openedPacking.containerTypes.find(item => item.id === row.definitionId)
      if (!optionsFor(data.containers, index).some(item => item.id === row.definitionId)) {
        form.setError(`containers.${index}.definitionId`, { message: 'Choose a size that fits the remaining tubes, or remove this container.' })
        setPage(Math.floor(index / pageSize))
        window.requestAnimationFrame(() => form.setFocus(`containers.${index}.definitionId`))
        return
      }
      if (!type || row.tubes > type.tubeCapacity) {
        form.setError(`containers.${index}.tubes`, { message: type ? `This container holds at most ${type.tubeCapacity} tubes.` : 'Choose a compatible container size.' })
        focusTubes(index)
        return
      }
      if (locationInventory && row.tubes > 0 && !resolveBarcode(index)) {
        setPage(Math.floor(index / pageSize))
        window.requestAnimationFrame(() => form.setFocus(`containers.${index}.containerBarcode`))
        return
      }
    }
    const expected = currentPreview.tubeCount - currentPreview.unallocatedTubes
    if (data.containers.reduce((sum, row) => sum + row.tubes, 0) !== expected) {
      form.setError('root.allocation', { message: `Assign exactly ${expected} tubes across these containers. Tubes without a container remain unallocated.` })
      return
    }
    const input = toPackingInput(data)
    // The API expands grouped quantities in selection order; counts must follow that same order.
    const containerTubeCounts = input.selection.flatMap(item => data.containers.filter(row => row.definitionId === item.containerDefinitionId).map(row => row.tubes))
    const stockKits = locationInventory ? input.selection.flatMap(item => data.containers.flatMap((row, index) => row.definitionId === item.containerDefinitionId && row.tubes > 0 ? [resolveBarcode(index)!].map(kit => ({ stockKitId: kit.stockKitId, version: kit.version })) : [])) : undefined
    if (locationInventory && !openedPacking.deliveryLocationId) { form.setError('root.allocation', { message: 'Choose a departure location before confirming containers.' }); return }
    onConfirm({ ...input, containerTubeCounts, version: openedPacking.version, ...(locationInventory ? { deliveryLocationId: openedPacking.deliveryLocationId!, stockKits } : {}) })
  }, errors => {
    const index = fields.findIndex((_, index) => errors.containers?.[index])
    if (index >= 0) focusTubes(index)
  })
  const applyRecommendation = () => {
    if (working) return
    suggest.mutate()
  }
  return <Dialog open onOpenChange={next => { if (!next) close() }}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Adjust containers</DialogTitle><DialogDescription>{locationInventory ? 'Scan each physical container barcode from the selected location' : availableKits ? 'Choose from received kits' : 'Add the containers you have'} and set how many of the {packing.tubeCount} tubes go in each. {locationInventory ? 'Confirmation reserves these containers; an unsaved scan does not.' : 'Empty containers will not become shipments.'}</DialogDescription></DialogHeader>
      {error || suggest.error ? <Alert variant="destructive"><AlertTitle>Containers were not confirmed</AlertTitle><AlertDescription>{apiErrorMessage(error ?? suggest.error)}</AlertDescription></Alert> : null}
      <form id="sample-packing" noValidate className="space-y-3" onSubmit={submit}>
        <section className="space-y-3" aria-label="Containers to use">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Containers to use</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={working} onClick={applyRecommendation}>{suggest.isPending ? 'Recommending…' : 'Use recommendation'}</Button>
              <Button ref={addButton} type="button" variant="outline" size="sm" disabled={working || !optionsFor(values.containers ?? []).length || fields.length >= quantityLimit || additionalCapacityNeeded === 0} onClick={addContainer}><Plus aria-hidden="true" data-icon="inline-start" />Add container</Button>
            </div>
          </div>
          {!fields.length ? <p className="text-sm text-muted-foreground">Add a container to start your packing plan.</p> : null}
          <div className="space-y-2">{fields.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize).map((field, offset) => {
            const index = visiblePage * pageSize + offset
            const row = values.containers?.[index]
            const type = openedPacking.containerTypes.find(item => item.id === row?.definitionId)
            const tubeError = form.formState.errors.containers?.[index]?.tubes
            const sizeError = form.formState.errors.containers?.[index]?.definitionId
            const barcodeError = form.formState.errors.containers?.[index]?.containerBarcode
            const sizeId = `container-size-${field.id}`
            const tubesId = `container-tubes-${field.id}`
            const helpId = `container-help-${field.id}`
            return <div key={field.id} role="group" aria-label={`Container ${index + 1}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] items-start gap-x-2 gap-y-1 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_5rem_2rem] sm:gap-x-3">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={sizeId}><RequiredFieldName><span className="sr-only">Container size for container {index + 1}</span><span aria-hidden="true">Container {index + 1}</span></RequiredFieldName></Label>
                <select id={sizeId} value={row?.definitionId ?? ''} disabled={working} className="h-8 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50" aria-invalid={Boolean(sizeError)} aria-describedby={`${helpId}${sizeError ? ` ${sizeId}-error` : ''}`} {...form.register(`containers.${index}.definitionId`, { onChange: event => changeSize(index, event.target.value) })}>
                  {type && !optionsFor(values.containers ?? [], index).some(option => option.id === type.id) ? <option value={type.id} disabled>{type.commonName} · Unavailable</option> : null}
                  {optionsFor(values.containers ?? [], index).map(option => <option key={option.id} value={option.id}>{option.commonName} · {option.sku}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={tubesId}><RequiredFieldName><span aria-hidden="true">Tubes</span><span className="sr-only">Tubes to pack · {type?.commonName ?? 'container'} #{index + 1}</span></RequiredFieldName></Label>
                <Input id={tubesId} className="h-8" type="number" min="0" max={type?.tubeCapacity} step="1" disabled={working} aria-invalid={Boolean(tubeError)} aria-describedby={`${helpId}${tubeError ? ` ${tubesId}-error` : ''}`} {...form.register(`containers.${index}.tubes`)} />
              </div>
              <Button type="button" variant="outline" size="icon" className="mt-5 size-8" disabled={working} aria-label={`Remove container ${index + 1}`} title={`Remove container ${index + 1}`} onClick={() => removeContainer(index)}><Trash2 aria-hidden="true" className="size-4" /></Button>
              <p id={helpId} className="col-span-full text-xs text-muted-foreground wrap-anywhere">SKU {type?.sku} · Capacity {type?.tubeCapacity}{type?.packingInstructions ? ` · ${type.packingInstructions}` : ''}</p>
              {locationInventory ? <div className="col-span-full mt-2 space-y-1.5"><Label htmlFor={`container-barcode-${field.id}`}><RequiredFieldName>Container {index + 1} barcode</RequiredFieldName></Label><Input id={`container-barcode-${field.id}`} className="font-mono uppercase" autoComplete="off" disabled={working} aria-invalid={Boolean(barcodeError)} aria-describedby={barcodeError ? `container-barcode-error-${field.id}` : undefined} {...form.register(`containers.${index}.containerBarcode`)} onBlur={() => { if (form.getValues(`containers.${index}.containerBarcode`)?.trim()) resolveBarcode(index, true) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (resolveBarcode(index, true)) form.setFocus(`containers.${index}.tubes`) } }} />{barcodeError ? <p id={`container-barcode-error-${field.id}`} role="alert" className="text-sm text-destructive">{barcodeError.message}</p> : row?.containerBarcode && packing.availableKits?.some(kit => kit.kitNumber.toUpperCase() === row.containerBarcode?.trim().toUpperCase() && kit.container.definitionId === row.definitionId) ? <p role="status" className="text-xs text-muted-foreground">Container identified. It will be reserved when you confirm.</p> : null}</div> : null}
              {sizeError ? <p id={`${sizeId}-error`} role="alert" className="col-span-full text-sm text-destructive">{sizeError.message}</p> : null}
              {tubeError ? <p id={`${tubesId}-error`} role="alert" className="col-span-full text-sm text-destructive">{tubeError.message}</p> : null}
            </div>
          })}</div>
          {pages > 1 ? <div className="flex items-center justify-between gap-2"><Button type="button" variant="outline" disabled={visiblePage === 0 || working} onClick={() => setPage(visiblePage - 1)}>Previous containers</Button><span className="text-xs">Page {visiblePage + 1} of {pages}</span><Button type="button" variant="outline" disabled={visiblePage === pages - 1 || working} onClick={() => setPage(visiblePage + 1)}>Next containers</Button></div> : null}
          {form.formState.errors.root?.allocation ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.allocation.message}</p> : null}
        </section>
        <section aria-labelledby="packing-summary-heading" aria-busy={!currentPreview && Boolean(inputSignature) && !preview.error} className="space-y-2">
          <h3 id="packing-summary-heading" className="text-sm font-semibold">Summary</h3>
          <div className="space-y-3">
            {writesBlocked ? <p role="status" className="text-sm text-muted-foreground">Current inventory must be verified before confirming. Your selections are retained.</p> : null}
            {unavailableSelection ? <Alert variant="destructive"><AlertTitle>Received kits changed</AlertTitle><AlertDescription>Your selections are still here. Remove unavailable containers or choose another received kit at this location.</AlertDescription></Alert> : null}
            {preview.error ? <Alert variant="destructive"><AlertTitle>Review container selection</AlertTitle><AlertDescription>{apiErrorMessage(preview.error)} <Button type="button" variant="outline" onClick={() => void preview.refetch()}>Retry preview</Button></AlertDescription></Alert> : null}
            <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-3">
              {[['Tubes', openedPacking.tubeCount], ['Containers', fields.length], ['Usable capacity', draftTotals.capacity], ['Spare slots', Math.max(0, draftTotals.capacity - draftTotals.assigned)], ['Unallocated tubes', Math.max(0, openedPacking.tubeCount - draftTotals.assigned)]].map(([label, value]) => <dl key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></dl>)}
              <div className="self-end text-xs text-muted-foreground" role="status">{!currentPreview && !preview.error && inputSignature ? 'Updating…' : null}</div>
            </div>
            {preview.data?.containerCount === 0 ? <p className="text-sm text-muted-foreground">Choose at least one compatible container to prepare a shipment.</p> : null}
            {additionalCapacityNeeded > 0 && fields.length > 0 ? <p className="text-sm">{additionalCapacityNeeded} tubes still need a container. You can prepare the allocated tubes now; the remaining tubes stay visible on the Job.</p> : null}
          </div>
        </section>
      </form>
      <RequiredDialogFooter><Button variant="outline" disabled={working} onClick={close}>Keep reviewing</Button><Button type="submit" form="sample-packing" disabled={working || writesBlocked || !packing.canPack || unavailableSelection || parsed.success && !currentPreview?.containerCount}>{busy ? 'Confirming…' : currentPreview && !currentPreview.isComplete ? 'Prepare available containers' : 'Confirm containers'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

export function PackingSummary({ preview, description }: { preview: ContainerRecommendation; description?: string }) {
  return <div className="space-y-3">
    <p className="text-sm">{description ?? preview.explanation}</p>
    <ul className="space-y-2">{preview.containers.map(item => <li key={item.containerDefinitionId} className="flex items-start gap-2 text-sm"><Package aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong>{item.quantity} × {item.commonName}</strong> · SKU {item.sku}<br /><span className="text-muted-foreground">{item.capacity} tubes per container · {item.assignedTubes} tubes allocated · {item.unusedCapacity} spare slots</span></span></li>)}</ul>
    <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-3">{[['Tubes', preview.tubeCount], ['Containers', preview.containerCount], ['Usable capacity', preview.totalCapacity], ['Spare slots', preview.unusedCapacity], ['Unallocated tubes', preview.unallocatedTubes]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
  </div>
}

function toPackingInput(values: PackingValues): PackingInput {
  const quantities = new Map<string, number>()
  for (const row of values.containers) quantities.set(row.definitionId, (quantities.get(row.definitionId) ?? 0) + 1)
  return { selection: Array.from(quantities, ([containerDefinitionId, quantity]) => ({ containerDefinitionId, quantity })) }
}
function recommendationRows(recommendation: ContainerRecommendation | undefined, packing: SampleShipmentPacking, availableKits?: SampleContainerQuantity[]): PackingValues['containers'] {
  let remaining = packing.tubeCount
  const rows: PackingValues['containers'] = []
  for (const item of recommendation?.containers ?? []) {
    for (let index = 0; index < item.quantity && remaining > 0 && rows.length < quantityLimit; index++) {
      if (!containerOptions(packing, rows, undefined, availableKits).some(type => type.id === item.containerDefinitionId)) break
      rows.push({ definitionId: item.containerDefinitionId, tubes: Math.min(item.capacity, remaining) })
      remaining -= item.capacity
    }
  }
  return rows
}

function containerOptions(packing: SampleShipmentPacking, rows: Array<{ definitionId?: string }>, excludedIndex?: number, availableKits?: SampleContainerQuantity[]) {
  const types = packing.containerTypes.filter(type => availableKits === undefined || (availableKits.find(item => item.containerDefinitionId === type.id)?.quantity ?? 0) > 0).sort((left, right) => left.tubeCapacity - right.tubeCapacity)
  const others = rows.flatMap((row, index) => index === excludedIndex ? [] : types.filter(type => type.id === row.definitionId))
  const otherCapacity = others.reduce((sum, type) => sum + type.tubeCapacity, 0)
  const needed = packing.tubeCount - otherCapacity
  if (needed <= 0) return []
  const smallestFit = types.find(type => type.tubeCapacity >= needed)
  return types.filter(candidate => (availableKits === undefined || others.filter(other => other.id === candidate.id).length < (availableKits.find(item => item.containerDefinitionId === candidate.id)?.quantity ?? 0)) && (!smallestFit || candidate.tubeCapacity <= smallestFit.tubeCapacity) && others.every(other => {
    const remaining = packing.tubeCount - (otherCapacity - other.tubeCapacity + candidate.tubeCapacity)
    const otherSmallestFit = types.find(type => type.tubeCapacity >= remaining)
    return remaining > 0 && (!otherSmallestFit || other.tubeCapacity <= otherSmallestFit.tubeCapacity)
  }))
}
