import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Printer, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import type { KitAssemblyState } from './use-kit-assembly-run'
import { useOrderDraftGuard } from '../use-order-draft-guard'
import { ShippingBarcode } from '#/features/sample-shipping/ShippingBarcode'
import './stock-kit-print.css'
import { RegisteredTubeList } from './StockKitFacts'

function barcodeLines(text: string) {
  return text.split(/\r?\n/).map(value => value.trim().toUpperCase().replace(/^\*(.+)\*$/, '$1')).filter(Boolean)
}
const validBarcode = (value: string) => /^[A-Z0-9._/-]{4,100}$/.test(value)

export function RecordKitPackedContentsDialog({ kit, assembly, writesBlocked, printOnOpen = false, refreshError = false, onRetryRefresh }: {
  kit: ShippingStockKit; assembly: KitAssemblyState; writesBlocked: boolean; printOnOpen?: boolean; refreshError?: boolean; onRetryRefresh?: () => void
}) {
  const [components] = useState(() => assembly.run!.components.filter(item => assembly.used(item.supplierProductId) < item.quantity))
  const inventory = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard })
  const mutation = assembly.useMutationRecord
  const submitting = useRef(false)
  const intent = useRef<'save' | 'complete'>('save')
  const automaticPrint = useRef(false)
  const step = assembly.run!.steps[0]
  const blocked = writesBlocked || !assembly.canEdit || assembly.run!.steps.length !== 1 || assembly.query.isFetching || inventory.isPending || inventory.isFetching || Boolean(inventory.error)
  function lotsFor(productId: string, quantity: number) {
    const all = (inventory.data?.materialLots ?? []).filter(lot => lot.supplierProductId === productId)
    const previousUses = assembly.run?.uses.filter(use => use.supplierProductId === productId) ?? []
    const component = components.find(item => item.supplierProductId === productId)
    const available = all.filter(lot => lot.availableQuantity > 0 && lot.availableQuantity >= quantity
      && !lot.quantityHoldReason && (component?.kind === 'Other' || lot.quantityUnit.toLowerCase() === 'each')
      && ['Passed', 'ApprovedException'].includes(lot.qcDisposition)
      && (!lot.expirationOrRetestDate || lot.expirationOrRetestDate >= new Date().toISOString().slice(0, 10))
      && (component?.kind !== 'Tube' || previousUses.every(use => use.sourceMaterialLotId === lot.id)))
    return { all, available, untrackedTubeUse: component?.kind === 'Tube' && previousUses.some(use => !use.sourceMaterialLotId) }
  }
  function newBarcodes(text: string) {
    return [...new Set(barcodeLines(text))].filter(value => validBarcode(value) && !kit.tubes.some(tube => tube.supplierBarcode === value))
  }
  function completesContents(rows: Array<{ quantity: string }>, scans: string) {
    return assembly.run!.components.every(component => {
      const index = components.findIndex(item => item.supplierProductId === component.supplierProductId)
      const quantity = index < 0 ? 0 : component.kind === 'Tube'
        ? kit.tubes.length + newBarcodes(scans).length - assembly.used(component.supplierProductId)
        : Number(rows[index]?.quantity ?? 0)
      return assembly.used(component.supplierProductId) + quantity === component.quantity
    })
  }
  const schema = z.object({ barcodes: z.string(), containerBarcode: z.string(), components: z.array(z.object({ quantity: z.string(), sourceMaterialLotId: z.string() })) }).superRefine((values, context) => {
    const codes = barcodeLines(values.barcodes)
    if (codes.some(value => !validBarcode(value))) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'Scan complete barcodes of 4–100 letters, numbers, dots, hyphens, underscores or slashes.' })
    else if (new Set(codes).size !== codes.length) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'A barcode appears more than once. Scan each physical tube once.' })
    else if (codes.some(value => kit.tubes.some(tube => tube.supplierBarcode === value))) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'A tube is already registered to this kit. Remove its scan before saving again.' })
    else if (codes.length > kit.container.capacity - kit.tubes.length) context.addIssue({ code: 'custom', path: ['barcodes'], message: 'Only ' + (kit.container.capacity - kit.tubes.length) + ' more tubes fit in this kit.' })
    values.components.forEach((value, index) => {
      const component = components[index]
      const quantity = component.kind === 'Tube' ? kit.tubes.length + newBarcodes(values.barcodes).length - assembly.used(component.supplierProductId) : Number(value.quantity)
      const remaining = component.quantity - assembly.used(component.supplierProductId)
      if (!value.quantity.trim() || !Number.isFinite(quantity) || quantity < 0 || quantity > remaining) {
        context.addIssue({ code: 'custom', path: ['components', index, 'quantity'], message: 'Enter a quantity from 0 to ' + remaining + '.' })
      } else if (component.kind !== 'Other' && !Number.isInteger(quantity)) {
        context.addIssue({ code: 'custom', path: ['components', index, 'quantity'], message: 'Count whole tubes and containers.' })
      }
      if (quantity > 0) {
        const lots = lotsFor(component.supplierProductId, quantity)
        if (lots.all.length && !lots.available.some(lot => lot.id === value.sourceMaterialLotId)) {
          context.addIssue({ code: 'custom', path: ['components', index, 'sourceMaterialLotId'], message: 'Choose an available source lot with enough stock.' })
        }
      }
    })
    if (values.containerBarcode && (!assembly.run!.labelPrintRequestedAtUtc || barcodeLines(values.containerBarcode).length !== 1 || barcodeLines(values.containerBarcode)[0] !== kit.kitNumber)) context.addIssue({ code: 'custom', path: ['containerBarcode'], message: 'Print the label, affix it, then scan this container’s barcode.' })
    if (intent.current === 'complete') {
      if (!completesContents(values.components, values.barcodes)) context.addIssue({ code: 'custom', path: ['components'], message: 'Pack the exact required quantity of every component.' })
      if (!assembly.run!.labelPrintRequestedAtUtc || (!assembly.run!.containerBarcodeVerifiedAtUtc && !values.containerBarcode)) context.addIssue({ code: 'custom', path: ['containerBarcode'], message: 'Print the label, affix it, then scan this container’s barcode.' })
    }
  })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: { barcodes: '', containerBarcode: '', components: components.map(item => ({
    quantity: String(Math.max(0, Math.min(item.quantity - assembly.used(item.supplierProductId), item.kind === 'Tube' ? kit.tubes.length - assembly.used(item.supplierProductId) : item.quantity))),
    sourceMaterialLotId: '',
  })) } })
  const values = form.watch('components')
  const barcodes = form.watch('barcodes')
  const containerBarcode = form.watch('containerBarcode')
  const exactContents = completesContents(values, barcodes)
  const labelReady = Boolean(assembly.run!.labelPrintRequestedAtUtc && (assembly.run!.containerBarcodeVerifiedAtUtc || (barcodeLines(containerBarcode).length === 1 && barcodeLines(containerBarcode)[0] === kit.kitNumber)))
  const expiredComponents = kit.productExpirations?.some(product => product.canExpire && (!product.expirationDate || product.expirationDate < new Date().toISOString().slice(0, 10)))
  const acceptedBarcodes = newBarcodes(barcodes)
  const tubeRosterReady = kit.tubes.length + acceptedBarcodes.length === kit.container.capacity
    && new Set([...kit.tubes.map(tube => tube.supplierBarcode), ...acceptedBarcodes]).size === kit.container.capacity
  const completeReady = exactContents && tubeRosterReady && labelReady && !expiredComponents
  const errors = form.formState.errors
  const allowNavigation = useOrderDraftGuard(form.formState.isDirty, assembly.pending)
  useEffect(() => {
    if (printOnOpen && !automaticPrint.current && assembly.canEdit && !assembly.query.isFetching) {
      automaticPrint.current = true
      assembly.printLabel.mutate()
    }
  }, [printOnOpen, assembly])
  const tubeQuantities = components.map(component => component.kind === 'Tube' ? Math.max(0, kit.tubes.length + acceptedBarcodes.length - assembly.used(component.supplierProductId)) : null)
  const tubeQuantitiesKey = JSON.stringify(tubeQuantities)
  useEffect(() => {
    // Scans and recorded use are authoritative for these read-only quantities.
    const quantities = JSON.parse(tubeQuantitiesKey) as Array<number | null>
    let changed = false
    quantities.forEach((quantity, index) => {
      if (quantity !== null && form.getValues(`components.${index}.quantity`) !== String(quantity)) {
        form.setValue(`components.${index}.quantity`, String(quantity), { shouldValidate: true })
        changed = true
      }
    })
    if (changed && form.formState.isSubmitted) void form.trigger()
  }, [form, tubeQuantitiesKey])
  function close() {
    if (!submitting.current && !assembly.pending && (!form.formState.isDirty || window.confirm('Discard the unsaved assembly entries? Previously saved scans and material use will be retained.'))) { allowNavigation(); assembly.setComponentsOpen(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent className="max-w-2xl stock-kit-print-dialog" showCloseButton={!assembly.pending}>
    <DialogHeader><DialogTitle>Assemble transportation kit</DialogTitle><DialogDescription>{kit.container.commonName} · {kit.container.capacity} tubes. Save for later to resume; the kit enters Inventory only when completed.</DialogDescription></DialogHeader>
    <div className="stock-kit-print-surface hidden print:block"><p>Phaeno · {kit.container.commonName} · SKU {kit.container.sku}</p><ShippingBarcode value={kit.kitNumber} label="Container barcode" /></div>
    {assembly.run!.steps.length !== 1 ? <Alert variant="destructive"><AlertTitle>Assembly workflow needs review</AlertTitle><AlertDescription>This kit must have one approved assembly step before packed contents can be recorded.</AlertDescription></Alert> : null}
    {assembly.run!.status !== 'InProgress' ? <Alert variant="warning"><AlertTitle>Assembly is no longer active</AlertTitle><AlertDescription>Close this modal to review the saved kit and its assembly history.</AlertDescription></Alert> : null}
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Packed contents need review</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'The request could not be confirmed.')} Your entries are retained. Review refreshed quantities and source lots; remove any scans already registered before trying again.</AlertDescription></Alert> : null}
    {assembly.printLabel.error ? <Alert variant="destructive"><AlertTitle>Label print request was not saved</AlertTitle><AlertDescription>{getLabOperationsError(assembly.printLabel.error, 'Retry printing before completing this kit.')}</AlertDescription></Alert> : null}
    {refreshError ? <Alert variant="destructive"><AlertTitle>Assembly refresh failed</AlertTitle><AlertDescription>Your entries are retained. Refresh the saved kit before continuing. <Button type="button" variant="outline" onClick={onRetryRefresh}>Retry assembly check</Button></AlertDescription></Alert> : null}
    {inventory.error ? <Alert variant="destructive"><AlertTitle>Component inventory unavailable</AlertTitle><AlertDescription>Retry before recording components. <Button type="button" variant="outline" onClick={() => void inventory.refetch()}>Retry inventory</Button></AlertDescription></Alert> : null}
    <form id="kit-components-record" noValidate className="space-y-4" onSubmit={form.handleSubmit(input => {
      if (blocked || submitting.current || assembly.pending) return
      submitting.current = true
      mutation.mutate({ version: assembly.run!.version, stockKitVersion: kit.version, supplierBarcodes: barcodeLines(input.barcodes), assemblyNotes: assembly.run!.draftNotes ?? null, complete: intent.current === 'complete', containerBarcode: barcodeLines(input.containerBarcode)[0] ?? null, components: input.components.flatMap((value, index) => {
        const component = components[index]
        const quantity = component.kind === 'Tube' ? kit.tubes.length + newBarcodes(input.barcodes).length - assembly.used(component.supplierProductId) : Number(value.quantity)
        return quantity > 0 ? [{ supplierProductId: component.supplierProductId, quantity, sourceMaterialLotId: value.sourceMaterialLotId || null }] : []
      }) }, { onSettled: () => { submitting.current = false; intent.current = 'save' } })
    }, () => { intent.current = 'save' })}>
      {inventory.isFetching || assembly.query.isFetching ? <p role="status" className="text-sm">Checking current quantities and component inventory…</p> : null}
      {step ? <section aria-labelledby="kit-packing-instructions" className="space-y-2 border-b pb-4">
        <h3 id="kit-packing-instructions" className="text-sm font-medium">Assembly instructions</h3>
        <p className="text-sm font-medium wrap-anywhere">{step.name}</p>
        <p className="whitespace-pre-wrap text-sm wrap-anywhere">{step.instructions}</p>
        {assembly.run!.stepRecords[0]?.notes ? <p className="whitespace-pre-wrap text-xs text-muted-foreground">Recorded completion notes: {assembly.run!.stepRecords[0].notes}</p> : <p className="text-xs text-muted-foreground">Complete records the assembly step and makes this kit available in Inventory.</p>}
      </section> : null}
      <section aria-labelledby="kit-label-heading" className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 id="kit-label-heading" className="text-sm font-medium">Container label</h3><Button type="button" variant="outline" disabled={assembly.pending || writesBlocked || !assembly.canEdit || assembly.query.isFetching} onClick={() => assembly.printLabel.mutate()}><Printer aria-hidden="true" />{assembly.printLabel.isPending ? 'Preparing label…' : 'Print container barcode'}</Button></div>
        <p className="wrap-anywhere font-mono text-xs text-muted-foreground">{kit.kitNumber}</p>
        {assembly.run!.containerBarcodeVerifiedAtUtc ? <p role="status" className="text-sm">Attached container barcode verified.</p> : <div className="space-y-1">
          <Label htmlFor="kit-attached-barcode"><RequiredFieldName>Attached container barcode</RequiredFieldName></Label>
          <FieldDescription id="kit-attached-barcode-help">Print the label, affix it to this container, then scan it here. Required to complete.</FieldDescription>
          <Input id="kit-attached-barcode" autoComplete="off" maxLength={100} disabled={assembly.pending || !assembly.run!.labelPrintRequestedAtUtc}
            aria-invalid={Boolean(errors.containerBarcode)} aria-describedby={'kit-attached-barcode-help' + (errors.containerBarcode ? ' kit-attached-barcode-error' : '')} {...form.register('containerBarcode')} />
          <FieldError id="kit-attached-barcode-error">{errors.containerBarcode?.message}</FieldError>
        </div>}
      </section>
      <FieldError>{errors.components?.root?.message ?? errors.components?.message}</FieldError>
      {kit.tubes.length ? <section aria-labelledby="kit-recorded-tubes-heading" className="space-y-2 border-b pb-4">
        <h3 id="kit-recorded-tubes-heading" className="text-sm font-medium">Recorded tubes · {kit.tubes.length} of {kit.container.capacity}</h3>
        <p className="text-xs text-muted-foreground">Review these saved IDs when resuming. Do not scan them again; scan only newly packed tubes.</p>
        <details><summary className="cursor-pointer rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-ring">View recorded tube IDs</summary><div className="mt-2"><RegisteredTubeList tubes={kit.tubes} /></div></details>
      </section> : null}
      {components.map((component, index) => {
        const quantity = Number(values[index]?.quantity ?? 0)
        const lots = lotsFor(component.supplierProductId, quantity)
        const quantityName = `components.${index}.quantity` as const
        const lotName = `components.${index}.sourceMaterialLotId` as const
        const id = 'kit-component-' + component.supplierProductId
        const quantityError = errors.components?.[index]?.quantity
        const lotError = errors.components?.[index]?.sourceMaterialLotId
        const remaining = component.quantity - assembly.used(component.supplierProductId)
        return <fieldset key={component.supplierProductId} className={'min-w-0 space-y-3 pb-4 ' + (index < components.length - 1 ? 'border-b' : '')}>
          <legend className="wrap-anywhere text-sm font-medium">{component.productNumber}</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <p className="wrap-anywhere">{component.supplierName}</p>
            <p className="shrink-0 tabular-nums">{assembly.used(component.supplierProductId)} of {component.quantity} recorded</p>
          </div>
          {component.kind === 'Tube' && (Boolean(barcodes.trim()) || (kit.tubes.length < kit.container.capacity)) ? <div className="space-y-1">
            <Label htmlFor="kit-packing-barcodes">Permanent tube barcodes</Label>
            <FieldDescription id="kit-packing-barcodes-help">Scan each new tube as it goes into this container, one per line. {kit.tubes.length} of {kit.container.capacity} already registered.</FieldDescription>
            <Textarea id="kit-packing-barcodes" rows={4} className="font-mono" autoComplete="off" spellCheck={false} disabled={assembly.pending}
              aria-invalid={Boolean(errors.barcodes)} aria-describedby={'kit-packing-barcodes-help' + (errors.barcodes ? ' kit-packing-barcodes-error' : '')}
              {...form.register('barcodes', { onChange: () => { if (form.formState.isSubmitted) void form.trigger() } })} />
            <FieldError id="kit-packing-barcodes-error">{errors.barcodes?.message}</FieldError>
            <p role="status" className="text-xs text-muted-foreground tabular-nums">{acceptedBarcodes.length} unique valid new scans · {kit.tubes.length + acceptedBarcodes.length} of {kit.container.capacity} tubes</p>
          </div> : null}
          <div className="grid items-start gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1">
              <Label htmlFor={id + '-quantity'}><RequiredFieldName>Quantity</RequiredFieldName></Label>
              <FieldDescription id={id + '-quantity-help'}>{component.kind === 'Tube' ? 'From tube scans.' : 'Packed now.'}</FieldDescription>
              <Input id={id + '-quantity'} required type="number" min={0} max={remaining}
                step={component.kind === 'Other' ? 'any' : 1} disabled={assembly.pending} readOnly={component.kind === 'Tube'}
                aria-invalid={Boolean(quantityError)}
                aria-describedby={id + '-quantity-help' + (quantityError ? ' ' + id + '-quantity-error' : '') + (component.kind === 'Tube' && quantity === 0 ? ' ' + id + '-scan-warning' : '')}
                {...form.register(quantityName, { onChange: () => {
                  if (form.formState.isSubmitted) void form.trigger()
                  else if (errors.components?.[index]?.sourceMaterialLotId) void form.trigger(lotName)
                } })} />
              <FieldError id={id + '-quantity-error'}>{quantityError?.message}</FieldError>
              {component.kind === 'Tube' && quantity === 0 ? <p id={id + '-scan-warning'} className="text-xs text-warning">Scan the packed tubes above to record their use.</p> : null}
            </div>
            {!inventory.isPending && !inventory.error ? lots.all.length ? <div className="min-w-0 space-y-1">
              <Label htmlFor={id + '-lot'}>{quantity > 0 ? <RequiredFieldName>Source lot</RequiredFieldName> : 'Source lot'}</Label>
              <FieldDescription id={id + '-lot-help'} className={quantity > 0 && !lots.available.length ? 'text-warning' : undefined}>
                {quantity > 0 && lots.untrackedTubeUse ? 'Earlier tubes were recorded without a source lot. Review their recorded use before packing more tubes.' : quantity > 0 && !lots.available.length ? 'No eligible lot has enough available stock.' : component.kind === 'Tube' ? 'All tubes must use the same lot.' : 'Stock is deducted when recorded.'}
              </FieldDescription>
              <select id={id + '-lot'} required={quantity > 0} disabled={assembly.pending || quantity <= 0}
                aria-invalid={Boolean(lotError)} aria-describedby={id + '-lot-help' + (lotError ? ' ' + id + '-lot-error' : '')}
                className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                {...form.register(lotName)}>
                <option value="">Select source lot</option>
                {lots.available.map(lot => <option key={lot.id} value={lot.id}>{lot.lotNumber} · {lot.availableQuantity} {lot.quantityUnit} available</option>)}
              </select>
              <FieldError id={id + '-lot-error'}>{lotError?.message}</FieldError>
            </div> : <div className="min-w-0 space-y-1">
              <p className="text-sm leading-none font-medium">Source lot</p>
              <FieldDescription>Stock tracking for this component.</FieldDescription>
              <Alert variant="warning" className="text-xs">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>No tracked source lots</AlertTitle>
                <AlertDescription className="text-xs">Quantity will be recorded without deducting source-lot stock.</AlertDescription>
              </Alert>
            </div> : null}
          </div>
        </fieldset>
      })}
      <p className="text-sm text-muted-foreground">Complete confirms that all recorded tubes and required contents are packed in this container.</p>
      {!completeReady ? <Alert variant="warning"><AlertTitle>Before completing</AlertTitle><AlertDescription><ul className="list-disc space-y-1 pl-4">
        {!exactContents ? <li>Record the exact required contents.</li> : null}
        {!tubeRosterReady ? <li>Record all {kit.container.capacity} unique tube IDs as the tubes are packed.</li> : null}
        {!labelReady ? <li>Print and attach the container label, then scan its barcode.</li> : null}
        {expiredComponents ? <li>A component is expired or has no verified expiration date. Review the saved kit’s product expiration records.</li> : null}
      </ul></AlertDescription></Alert> : null}
    </form>
    <RequiredDialogFooter><Button type="button" variant="ghost" disabled={assembly.pending} onClick={close}>Cancel</Button><Button type="submit" form="kit-components-record" variant="outline" disabled={blocked || assembly.pending} onClick={() => { intent.current = 'save' }}>{mutation.isPending && intent.current === 'save' ? 'Saving…' : 'Save for later'}</Button><Button type="submit" form="kit-components-record" disabled={blocked || assembly.pending || !completeReady} onClick={() => { intent.current = 'complete' }}>{mutation.isPending && intent.current === 'complete' ? 'Completing…' : 'Complete'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
