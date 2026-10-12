import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
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
  const __customerText = useCustomerText()

  const [openedPacking] = useState(packing)
  const [page, setPage] = useState(0)
  const addButton = useRef<HTMLButtonElement>(null)
  const form = useForm<z.input<typeof packingSchema>, unknown, PackingValues>({
    resolver: zodResolver(packingSchema),
    defaultValues: {
      containers: recommendationRows(initial, openedPacking, availableKits),
    },
  })
  const { isDirty: __formDraftDirty } = form.formState

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
  const isDirty = __formDraftDirty
  const working = busy || suggest.isPending
  const currentPreview = previewSignature === inputSignature && !preview.isFetching && !preview.isPlaceholderData && !preview.error ? preview.data : undefined
  const pages = Math.max(1, Math.ceil(fields.length / pageSize))
  const visiblePage = Math.min(page, pages - 1)
  const close = async () => { if (!working && (!isDirty || (await confirmPortal('Discard the unsaved container selection?')))) onClose() }
  useBlocker({ shouldBlockFn: async () => working || isDirty && !(await confirmPortal('Discard the unsaved container selection?')), enableBeforeUnload: working || isDirty })
  const capacityNeeded = (rows: Array<{ definitionId?: string }>, excludedIndex?: number) => Math.max(0, openedPacking.tubeCount - rows.reduce((sum, row, index) => sum + (index === excludedIndex ? 0 : openedPacking.containerTypes.find(type => type.id === row.definitionId)?.tubeCapacity ?? 0), 0))
  const additionalCapacityNeeded = capacityNeeded(values.containers ?? [])
  const optionsFor = (rows: Array<{ definitionId?: string }>, index?: number) => containerOptions(openedPacking, rows, index, availableKits)
  const availableContainerCount = availableKits?.reduce((count, item) => count + (openedPacking.containerTypes.some(type => type.id === item.containerDefinitionId) ? item.quantity : 0), 0)
  const canRemoveContainer = fields.length !== 1 || availableContainerCount !== 1 || !availableKits?.some(item => item.quantity > 0 && item.containerDefinitionId === values.containers?.[0]?.definitionId)
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
    if (working || !canRemoveContainer) return
    const nextIndex = Math.min(index, fields.length - 2)
    remove(index)
    const remaining = form.getValues('containers')
    if (remaining.length === 1) {
      const type = openedPacking.containerTypes.find(item => item.id === remaining[0].definitionId)
      if (type) form.setValue('containers.0.tubes', Math.min(type.tubeCapacity, openedPacking.tubeCount), { shouldDirty: true, shouldValidate: true })
    }
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
    window.requestAnimationFrame(() => form.setFocus(fields.length === 1 ? `containers.${index}.definitionId` : `containers.${index}.tubes`))
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
    if (locationInventory && !openedPacking.deliveryLocationId) { form.setError('root.allocation', { message: 'Choose a container location before confirming containers.' }); return }
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
      <DialogHeader><DialogTitle><CustomerText message="m_1ce09aa2747e" /></DialogTitle><DialogDescription>{locationInventory ? <CustomerSourceText source={"Scan or enter each physical container barcode from the selected location"} /> : availableKits ? "Choose from received kits" : __customerText('m_61a724065aed')} <CustomerText message="m_3da756415c85" />{packing.tubeCount} <CustomerText message="m_e3fe3d56ed3f" />{locationInventory ? <CustomerSourceText source={"Confirmation reserves these containers; an unsaved scan does not."} /> : __customerText('m_a32b3908b4c7')}</DialogDescription></DialogHeader>
      {error || suggest.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_fd06c04e4dd4" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(error ?? suggest.error)} /></AlertDescription></Alert> : null}
      <form id="sample-packing" noValidate className="space-y-3" onSubmit={submit}>
        <section className="space-y-3" aria-label={__customerText('m_7aaf1e3a13b9')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold"><CustomerText message="m_7aaf1e3a13b9" /></h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={working} onClick={applyRecommendation}>{suggest.isPending ? <CustomerSourceText source={"Recommending…"} /> : __customerText('m_76eb29b2d1b0')}</Button>
              <Button ref={addButton} type="button" variant="outline" size="sm" disabled={working || !optionsFor(values.containers ?? []).length || fields.length >= quantityLimit || additionalCapacityNeeded === 0} onClick={addContainer}><Plus aria-hidden="true" data-icon="inline-start" /><CustomerText message="m_f5bd263af954" /></Button>
            </div>
          </div>
          {!fields.length ? <p className="text-sm text-muted-foreground"><CustomerText message="m_b0450c0a179a" /></p> : null}
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
            return <div key={field.id} role="group" aria-labelledby={`container-heading-${field.id}`} className={`grid items-start gap-x-2 gap-y-1 rounded-md border p-3 sm:gap-x-3 ${canRemoveContainer ? 'grid-cols-[minmax(0,1fr)_4.5rem_2rem] sm:grid-cols-[minmax(0,1fr)_5rem_2rem]' : 'grid-cols-[minmax(0,1fr)_4.5rem] sm:grid-cols-[minmax(0,1fr)_5rem]'}`}>
              <h4 id={`container-heading-${field.id}`} className="col-span-full mb-2 text-sm font-semibold"><CustomerText message="m_1fad83691c37" />{index + 1}</h4>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={sizeId}><RequiredFieldName><CustomerText message="m_0c7823e8c759" /></RequiredFieldName></Label>
                <NativeSelect id={sizeId} value={row?.definitionId ?? ''} disabled={working} className="w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50" aria-invalid={Boolean(sizeError)} aria-describedby={`${helpId}${sizeError ? ` ${sizeId}-error` : ''}`} {...form.register(`containers.${index}.definitionId`, { onChange: event => changeSize(index, event.target.value) })}>
                  {type && !optionsFor(values.containers ?? [], index).some(option => option.id === type.id) ? <option value={type.id} disabled>{type.commonName} <CustomerText message="m_77649d652d5d" /></option> : null}
                  {optionsFor(values.containers ?? [], index).map(option => <option key={option.id} value={option.id}>{option.commonName} · {option.sku}</option>)}
                </NativeSelect>
              </div>
              {fields.length === 1 ? <div className="space-y-1.5"><Label htmlFor={tubesId}><span aria-hidden="true"><CustomerText message="m_9896e020cb56" /></span><span className="sr-only"><CustomerText message="m_a90d48ed22c8" />{type?.commonName ?? 'container'} #{index + 1}</span></Label><Input id={tubesId} className="h-8 cursor-default bg-muted text-muted-foreground dark:bg-muted" type="text" readOnly aria-describedby={helpId} {...form.register(`containers.${index}.tubes`)} /></div> : <div className="space-y-1.5">
                <Label htmlFor={tubesId}><RequiredFieldName><span aria-hidden="true"><CustomerText message="m_9896e020cb56" /></span><span className="sr-only"><CustomerText message="m_a90d48ed22c8" />{type?.commonName ?? 'container'} #{index + 1}</span></RequiredFieldName></Label>
                <Input id={tubesId} className="h-8" type="number" min="0" max={type?.tubeCapacity} step="1" disabled={working} aria-invalid={Boolean(tubeError)} aria-describedby={`${helpId}${tubeError ? ` ${tubesId}-error` : ''}`} {...form.register(`containers.${index}.tubes`)} />
              </div>}
              {canRemoveContainer ? <Button type="button" variant="outline" size="icon" className="mt-5 size-8" disabled={working} aria-label={__customerText('m_6573cdad3772', { p0: String(index + 1) })} title={__customerText('m_6573cdad3772', { p0: String(index + 1) })} onClick={() => removeContainer(index)}><Trash2 aria-hidden="true" className="size-4" /></Button> : null}
              <p id={helpId} className="col-span-full text-xs text-muted-foreground wrap-anywhere"><CustomerText message="m_7370f6c81297" />{type?.sku} <CustomerText message="m_37bdf9777d54" />{type?.tubeCapacity}</p>
              {locationInventory ? <div className="col-span-full mt-2 space-y-1.5"><Label htmlFor={`container-barcode-${field.id}`}><RequiredFieldName><CustomerText message="m_203f66410f97" /></RequiredFieldName></Label><Input id={`container-barcode-${field.id}`} className="font-mono uppercase" autoComplete="off" disabled={working} aria-invalid={Boolean(barcodeError)} aria-describedby={barcodeError ? `container-barcode-error-${field.id}` : undefined} {...form.register(`containers.${index}.containerBarcode`)} onBlur={() => { if (form.getValues(`containers.${index}.containerBarcode`)?.trim()) resolveBarcode(index, true) }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (resolveBarcode(index, true) && fields.length > 1) form.setFocus(`containers.${index}.tubes`) } }} />{barcodeError ? <p id={`container-barcode-error-${field.id}`} role="alert" className="text-sm text-destructive">{<CustomerSourceText source={barcodeError.message} />}</p> : row?.containerBarcode && packing.availableKits?.some(kit => kit.kitNumber.toUpperCase() === row.containerBarcode?.trim().toUpperCase() && kit.container.definitionId === row.definitionId) ? <p role="status" className="text-xs text-muted-foreground"><CustomerText message="m_bd79ce7f7321" /></p> : null}</div> : null}
              {sizeError ? <p id={`${sizeId}-error`} role="alert" className="col-span-full text-sm text-destructive">{<CustomerSourceText source={sizeError.message} />}</p> : null}
              {tubeError ? <p id={`${tubesId}-error`} role="alert" className="col-span-full text-sm text-destructive">{<CustomerSourceText source={tubeError.message} />}</p> : null}
            </div>
          })}</div>
          {pages > 1 ? <div className="flex items-center justify-between gap-2"><Button type="button" variant="outline" disabled={visiblePage === 0 || working} onClick={() => setPage(visiblePage - 1)}><CustomerText message="m_1b506aa51b19" /></Button><span className="text-xs"><CustomerText message="m_6076934f99bd" />{visiblePage + 1} of {pages}</span><Button type="button" variant="outline" disabled={visiblePage === pages - 1 || working} onClick={() => setPage(visiblePage + 1)}><CustomerText message="m_0667565d5667" /></Button></div> : null}
          {form.formState.errors.root?.allocation ? <p role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.root.allocation.message} />}</p> : null}
        </section>
        <section aria-labelledby="packing-summary-heading" aria-busy={!currentPreview && Boolean(inputSignature) && !preview.error} className="space-y-2">
          <h3 id="packing-summary-heading" className="text-sm font-semibold"><CustomerText message="m_8e76a94ac832" /></h3>
          <div className="space-y-3">
            {writesBlocked ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_597bd327ecf5" /></p> : null}
            {unavailableSelection ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_cef8b61a5c6d" /></AlertTitle><AlertDescription><CustomerText message="m_0fe510207f07" /></AlertDescription></Alert> : null}
            {preview.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_5516df411f22" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(preview.error)} /> <Button type="button" variant="outline" onClick={() => void preview.refetch()}><CustomerText message="m_ceba35272869" /></Button></AlertDescription></Alert> : null}
            <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-3">
              {[['Tubes', openedPacking.tubeCount], ['Containers', fields.length], ['Usable capacity', draftTotals.capacity], ['Spare slots', Math.max(0, draftTotals.capacity - draftTotals.assigned)], ['Unallocated tubes', Math.max(0, openedPacking.tubeCount - draftTotals.assigned)]].map(([label, value]) => <dl key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></dl>)}
              <div className="self-end text-xs text-muted-foreground" role="status">{!currentPreview && !preview.error && inputSignature ? <CustomerSourceText source={"Updating…"} /> : null}</div>
            </div>
            {preview.data?.containerCount === 0 ? <p className="text-sm text-muted-foreground"><CustomerText message="m_9be13ae10eb8" /></p> : null}
            {additionalCapacityNeeded > 0 && fields.length > 0 ? <p className="text-sm">{additionalCapacityNeeded} <CustomerText message="m_81155322933a" /></p> : null}
          </div>
        </section>
      </form>
      <RequiredDialogFooter><Button variant="outline" disabled={working} onClick={close}><CustomerText message="m_34411a1bde47" /></Button><Button type="submit" form="sample-packing" disabled={working || writesBlocked || !packing.canPack || unavailableSelection || parsed.success && !currentPreview?.containerCount}>{busy ? <CustomerSourceText source={"Confirming…"} /> : currentPreview && !currentPreview.isComplete ? "Confirm partial assignment" : __customerText('m_3f9b843a2106')}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

export function PackingSummary({ preview, description }: { preview: ContainerRecommendation; description?: string }) {
  return <div className="space-y-3">
    <h3 className="text-sm font-semibold"><CustomerText message="m_c448fa7771e5" /></h3>
    <p className="text-sm">{description ?? preview.explanation}</p>
    <ul className="space-y-2">{preview.containers.map(item => <li key={item.containerDefinitionId} className="flex items-start gap-2 text-sm"><Package aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span><strong>{item.quantity} × {item.commonName}</strong> <CustomerText message="m_ce92c91a9097" />{item.sku}<br /><span className="text-muted-foreground">{item.capacity} <CustomerText message="m_2f728cb81280" />{item.assignedTubes} <CustomerText message="m_f5d2219270bd" />{item.unusedCapacity} <CustomerText message="m_a463107d506f" /></span></span></li>)}</ul>
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
