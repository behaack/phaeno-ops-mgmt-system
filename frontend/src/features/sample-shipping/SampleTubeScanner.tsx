import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { createPortal } from 'react-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { CheckCircle2, ScanBarcode } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { orderedSampleTubes } from './sample-tube-order'
import { SampleTubeRow } from './SampleTubeRow'
import { TubeMaterialAmountFields, tubeMaterialAmountShape } from './TubeMaterialAmountFields'

const scanSchema = z.object({ barcode: z.string().trim().min(4, 'Scan or enter the complete tube barcode.').max(100), ...tubeMaterialAmountShape })
const emptyScan = { barcode: '', customerDeclaredQuantity: '', customerDeclaredQuantityUnit: '' }
type ScanValues = z.infer<typeof scanSchema>
const pageSize = 8

export type SampleTubeListContext = {
  shipment: SampleShipmentWorkflow
  activeItem?: SampleShippingCrosswalkItem
  pending: boolean
  renderTube: (item: SampleShippingCrosswalkItem) => ReactNode
  focusActiveTube: () => void
}

export function SampleTubeScanner({ renderSamples, scanActionsTarget, scanning = true, onStartScanning, onStopScanning, shipment, canManage, requiresAssignedContainer = false, writesBlocked = false, specimenSources, sampleOrder, jobTubeProgress, onAssign, onCorrect, onScanActivityChange, onPendingChange }: {
  renderSamples?: (context: SampleTubeListContext) => ReactNode
  scanActionsTarget?: HTMLElement | null
  scanning?: boolean
  onStartScanning?: () => void
  onStopScanning?: () => void
  shipment: SampleShipmentWorkflow
  canManage: boolean
  requiresAssignedContainer?: boolean
  writesBlocked?: boolean
  specimenSources?: Record<string, string>
  sampleOrder?: string[]
  jobTubeProgress?: { matched: number; total: number }
  onAssign: (item: SampleShippingCrosswalkItem, barcode: string, amount: number, unit: string) => Promise<SampleShipmentWorkflow>
  onCorrect: (item: SampleShippingCrosswalkItem) => void
  onScanActivityChange?: (active: boolean) => void
  onPendingChange?: (pending: boolean) => void
}) {
  const __customerText = useCustomerText()

  const orderedTubes = orderedSampleTubes(shipment.crosswalk, sampleOrder)
  const form = useForm<ScanValues>({ resolver: zodResolver(scanSchema), defaultValues: emptyScan })
  const { isDirty: __formDraftDirty } = form.formState

  const [page, setPage] = useState(() => Math.floor(Math.max(0, orderedTubes.findIndex(item => !item.supplierTubeBarcode)) / pageSize))
  const [lastSaved, setLastSaved] = useState<{ sample: string; barcode: string } | null>(null)
  const [activeKey, setActiveKey] = useState(() => slotKey(orderedTubes.find(item => !item.supplierTubeBarcode)))
  const barcodeInput = useRef<HTMLInputElement>(null)
  const doneButton = useRef<HTMLButtonElement>(null)
  const barcodeField = form.register('barcode')
  const focusScanner = () => {
    const input = barcodeInput.current
    if (!input?.isConnected) return
    input.focus({ preventScroll: true })
    input.closest('li')?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' })
  }
  const lastFocusedSlot = useRef<string | null>(null)
  const lastMountedInput = useRef<HTMLInputElement | null>(null)
  const current = orderedTubes.find(item => slotKey(item) === activeKey)
  const nextUnmatched = orderedTubes.find(item => !item.supplierTubeBarcode)
  const currentKey = slotKey(current)
  const matched = shipment.crosswalk.filter(item => item.supplierTubeBarcode).length
  const allMatched = shipment.crosswalk.length > 0 && matched === shipment.crosswalk.length
  const canUseTubes = requiresAssignedContainer ? Boolean(shipment.assignedContainer) : Boolean(shipment.container) || shipment.returnKit?.status === 'Fulfilled'
  const canMatch = canManage && shipment.status === 'Preparing' && canUseTubes && !shipment.isPackingPool
  const canScan = canMatch && scanning
  const mutation = useMutation({
    mutationFn: ({ item, barcode, amount, unit }: { item: SampleShippingCrosswalkItem; barcode: string; amount: number; unit: string }) => onAssign(item, barcode, amount, unit),
    onSuccess: (saved, { item, barcode }) => {
      const updated = saved.crosswalk.find(row => (row.tubeSlotId ?? row.shipmentItemId) === (item.tubeSlotId ?? item.shipmentItemId))
      setLastSaved({ sample: item.customerSampleId, barcode: updated?.supplierTubeBarcode ?? barcode })
      form.reset(emptyScan)
      const savedTubes = orderedSampleTubes(saved.crosswalk, sampleOrder)
      const next = savedTubes.findIndex(row => !row.supplierTubeBarcode)
      setActiveKey(slotKey(savedTubes[next]))
      if (next >= 0) setPage(Math.floor(next / pageSize))
    },
  })
  const isDirty = __formDraftDirty
  useEffect(() => {
    onScanActivityChange?.(isDirty || mutation.isPending)
    return () => onScanActivityChange?.(false)
  }, [isDirty, mutation.isPending, onScanActivityChange])
  useEffect(() => { onPendingChange?.(mutation.isPending) }, [mutation.isPending, onPendingChange])
  useEffect(() => () => { onPendingChange?.(false) }, [onPendingChange])
  useBlocker({ shouldBlockFn: async () => mutation.isPending || isDirty && !(await confirmPortal('Discard the unsaved tube scan and material amount?')), enableBeforeUnload: () => mutation.isPending || isDirty, disabled: !mutation.isPending && !isDirty })
  useEffect(() => {
    if (!canScan) lastFocusedSlot.current = null
    if (canScan && currentKey && !mutation.isPending && (lastFocusedSlot.current !== currentKey || mutation.error)) {
      const timeout = window.setTimeout(() => { lastFocusedSlot.current = currentKey; const input = barcodeInput.current; if (input?.isConnected) { input.focus({ preventScroll: true }); input.closest('li')?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' }) } }, 0)
      return () => window.clearTimeout(timeout)
    }
  }, [canScan, currentKey, form, mutation.error, mutation.isPending])
  useEffect(() => {
    if (scanning && allMatched && !mutation.isPending && !writesBlocked) doneButton.current?.focus()
  }, [scanning, allMatched, mutation.isPending, writesBlocked])
  const pageCount = Math.max(1, Math.ceil(shipment.crosswalk.length / pageSize))
  const visiblePage = Math.min(page, pageCount - 1)
  const rows = orderedTubes.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize)
  const activeIndex = orderedTubes.findIndex(item => slotKey(item) === currentKey)
  const activePage = activeIndex < 0 ? null : Math.floor(activeIndex / pageSize)

  const scanForm = canScan && current && !current.supplierTubeBarcode ? <form noValidate aria-label={__customerText('m_5a402e97f7de', { p0: String(current.tubeOrdinal ?? 1), p1: String(current.customerSampleId) })} className="space-y-3" onSubmit={form.handleSubmit(values => { if (!mutation.isPending && !writesBlocked) mutation.mutate({ item: current, barcode: values.barcode, amount: Number(values.customerDeclaredQuantity), unit: values.customerDeclaredQuantityUnit }) })}>

        <div className="space-y-1.5"><Label htmlFor="active-tube-barcode"><RequiredFieldName><CustomerText message="m_0b716594fd88" /></RequiredFieldName></Label><div className="flex flex-wrap items-start gap-2"><Input id="active-tube-barcode" className="min-w-40 flex-1 font-mono" autoComplete="off" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.barcode)} aria-describedby={form.formState.errors.barcode ? "tube-scan-error" : undefined} {...barcodeField} ref={element => { barcodeField.ref(element); barcodeInput.current = element; if (element && lastMountedInput.current !== element) { lastMountedInput.current = element; window.requestAnimationFrame(focusScanner) } }} /><Button type="submit" disabled={mutation.isPending || writesBlocked}><ScanBarcode data-icon="inline-start" />{mutation.isPending ? <CustomerSourceText source={"Saving scan…"} /> : __customerText('m_846c0e268fff')}</Button></div>{form.formState.errors.barcode ? <p id="tube-scan-error" role="alert" className="text-sm text-destructive">{<CustomerSourceText source={form.formState.errors.barcode.message} />}</p> : null}</div>
        <TubeMaterialAmountFields idPrefix="active-tube" quantityField={form.register('customerDeclaredQuantity')} unitField={form.register('customerDeclaredQuantityUnit')} quantityError={form.formState.errors.customerDeclaredQuantity?.message} unitError={form.formState.errors.customerDeclaredQuantityUnit?.message} disabled={mutation.isPending} />
        <p className="text-xs text-muted-foreground"><span aria-hidden="true" className="text-destructive">*</span> <CustomerText message="m_288f5eea402e" /></p>
        {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_79b83f567fc2" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(mutation.error)} /> <CustomerText message="m_58af9f57fce0" /></AlertDescription></Alert> : null}
      </form> : null

  const renderTube = (item: SampleShippingCrosswalkItem) => <SampleTubeRow key={slotKey(item)} item={item}
    scanForm={canScan && slotKey(item) === currentKey ? scanForm : undefined}
    containerLabel={renderSamples ? [shipment.assignedContainer?.kitNumber, shipment.shipmentNumber, shipment.status === 'Cancelled' ? 'Retired' : null].filter(Boolean).join(' · ') : undefined}
    source={specimenSources ? specimenSources[item.submittedSpecimenId] || 'Biological source not available \u00b7 Review sample context.' : undefined} active={canScan && slotKey(item) === currentKey}
    action={canManage && item.supplierTubeBarcode && (shipment.status === 'Preparing' || shipment.status === 'ReadyToShip') && canUseTubes
      ? <Button size="sm" variant="outline" disabled={mutation.isPending || writesBlocked} onClick={() => onCorrect(item)}>{item.customerDeclaredQuantity == null ? <CustomerSourceText source={"Record material amount"} /> : shipment.currentPacket ? "Correct tube" : __customerText('m_6e084f5b7812')}</Button> : null} />
  const scanAction = renderSamples && canMatch && (scanning ? allMatched : Boolean(nextUnmatched)) ? <Button ref={scanning ? doneButton : undefined} variant="outline" disabled={mutation.isPending || writesBlocked} onClick={async () => {
    if (scanning) {
      if (!isDirty || (await confirmPortal('Discard the unsaved tube scan?'))) {
        const card = scanActionsTarget?.closest<HTMLElement>('[data-slot="card"]')
        form.reset(emptyScan); mutation.reset(); onStopScanning?.()
        if (card) window.requestAnimationFrame(() => card.focus())
      }
    } else onStartScanning?.()
  }}>{scanning ? <CustomerSourceText source={"Done scanning"} /> : __customerText('m_9d0df4221089')}</Button> : null
  const Container = renderSamples ? 'div' : Card
  const Content = renderSamples ? 'div' : CardContent
  return <Container>
    {!renderSamples ? <CardHeader><CardTitle><CustomerText message="m_259aeec9d9b1" /></CardTitle><CardDescription><CustomerText message="m_8353d27ab006" /></CardDescription></CardHeader> : null}
    <Content className="space-y-4">
      {scanAction ? scanActionsTarget ? createPortal(scanAction, scanActionsTarget) : scanActionsTarget === undefined ? <div className="flex justify-end">{scanAction}</div> : null : null}
      {renderSamples && canMatch && nextUnmatched ? <p className="text-sm text-muted-foreground">{canScan ? <CustomerSourceText source={"Scan the tube shown below. Each match is saved before advancing."} /> : __customerText('m_b6d338677262')}</p> : null}
      {renderSamples && !nextUnmatched && shipment.crosswalk.length > 0 ? <p role="status" className="text-sm font-medium"><CustomerText message="m_6b2fd69ca13a" />{matched} <CustomerText message="m_5f54d6f22002" /></p> : null}
      {!renderSamples || canScan && Boolean(nextUnmatched) ? <>
      <p className="text-sm wrap-anywhere"><CustomerText message="m_2b2017d086b4" /><strong>{shipment.shipmentNumber}</strong>{shipment.container ? ` · ${shipment.container.commonName}` : ''}</p>
      <p role="status" className="text-sm font-medium">{matched} of {shipment.crosswalk.length} <CustomerText message="m_690379010bd2" /></p>
      {jobTubeProgress ? <p className="text-xs text-muted-foreground"><CustomerText message="m_50c2ba0b3d1e" />{jobTubeProgress.matched} of {jobTubeProgress.total} <CustomerText message="m_6f84cc038450" /></p> : null}
      <div role="progressbar" aria-label={__customerText('m_6631f2b7094c')} aria-valuenow={matched} aria-valuemin={0} aria-valuemax={Math.max(1, shipment.crosswalk.length)} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${matched / Math.max(1, shipment.crosswalk.length) * 100}%` }} /></div>
      {canScan && nextUnmatched && (!current || current.supplierTubeBarcode) ? <Alert><AlertTitle><CustomerText message="m_1fa99ab085ef" /></AlertTitle><AlertDescription><CustomerText message="m_397e52b21dfc" /><Button variant="outline" disabled={mutation.isPending} onClick={async () => { if (!isDirty || (await confirmPortal('Discard the unsaved tube scan and continue to the next unmatched tube?'))) { form.reset(emptyScan); mutation.reset(); setActiveKey(slotKey(nextUnmatched)); setPage(Math.floor(orderedTubes.indexOf(nextUnmatched) / pageSize)) } }}><CustomerText message="m_a3716690db07" /></Button></AlertDescription></Alert> : null}
      {writesBlocked ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_1e0584c493a2" /></p> : null}
      {shipment.assignedContainer ? <p className="text-sm wrap-anywhere"><CustomerText message="m_1fad83691c37" /><strong>{shipment.assignedContainer.kitNumber}</strong> <CustomerText message="m_6d09d853a74f" /></p> : null}
      {canScan && current && !current.supplierTubeBarcode ? null : canScan && !nextUnmatched ? <p role="status" className="flex items-center gap-2 text-sm"><CheckCircle2 aria-hidden="true" className="size-4 text-primary" /><CustomerText message="m_dd918536bcf8" /></p> : <p className="text-sm text-muted-foreground">{shipment.isPackingPool ? <CustomerSourceText source={"Choose containers before scanning tubes."} /> : !canUseTubes ? requiresAssignedContainer ? "Confirm a received container before scanning its tubes." : "Scanning becomes available after Phaeno registers and fulfills the return kit." : __customerText('m_a94e175eadaf')}</p>}
      </> : null}
      <p role="status" aria-atomic="true" className="sr-only">{lastSaved ? __customerText('m_47b21a7c940e', { p0: String(lastSaved.barcode), p1: String(lastSaved.sample) }) : ''}</p>
      {!renderSamples && canScan && current && !current.supplierTubeBarcode && activePage !== null && activePage !== visiblePage ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground"><CustomerText message="m_a08f101a9b97" />{current.customerSampleId}<CustomerText message="m_042710a33c8f" />{current.tubeOrdinal ?? 1}.</p><Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { setPage(activePage); window.requestAnimationFrame(focusScanner) }}><CustomerText message="m_e12a3860e129" /></Button></div> : null}
      {renderSamples ? renderSamples({ shipment, activeItem: canScan && current && !current.supplierTubeBarcode ? current : undefined, pending: mutation.isPending,
        renderTube, focusActiveTube: focusScanner }) : <div className="rounded-md border"><ul className="divide-y">{rows.map(renderTube)}</ul></div>}
      {!renderSamples && pageCount > 1 ? <nav aria-label={__customerText('m_8ccb7e38fc80')} className="flex flex-wrap items-center justify-between gap-2"><p aria-live="polite" className="text-xs text-muted-foreground"><CustomerText message="m_007642ea118d" />{visiblePage * pageSize + 1}–{Math.min((visiblePage + 1) * pageSize, shipment.crosswalk.length)} of {shipment.crosswalk.length} <CustomerText message="m_9133787d0299" /></p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={visiblePage === 0 || mutation.isPending} onClick={() => setPage(visiblePage - 1)}><CustomerText message="m_def28ef2c84c" /></Button><Button variant="outline" size="sm" disabled={visiblePage === pageCount - 1 || mutation.isPending} onClick={() => setPage(visiblePage + 1)}><CustomerText message="m_9e59b8c3a311" /></Button></div></nav> : null}
    </Content>
  </Container>
}

function slotKey(item?: SampleShippingCrosswalkItem) { return item?.tubeSlotId ?? item?.shipmentItemId ?? null }

