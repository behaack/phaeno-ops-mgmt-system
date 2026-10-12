import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, CircleCheck, Pencil, Eraser, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { confirmLabSampleImport, deleteLabSample, downloadLabSampleTemplate, finalizeLabSampleRoster, getOrderErrorMessage, previewLabSampleImport, type LabSample, type LabSampleImportPreview, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabSampleDialog } from './LabSampleDialog'
import { SampleIdentificationRows } from './SampleIdentificationRows'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { SampleTubeListContext } from '#/features/sample-shipping/SampleTubeScanner'
import { SampleTubeRow } from '#/features/sample-shipping/SampleTubeRow'
import { OrderStatusBadge } from './OrderStatusBadge'
import { RelatedSampleShipments } from '#/features/sample-shipping/RelatedSampleShipments'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import { groupSampleRows, hasCompleteSampleIdentification, normalizeBiologicalSource } from './sample-source-capacity'

const samplePageSize = 10

export function LabJobSamplesPanel({ order, embedded = false, page, onPageChange, tubeShipments, tubeContext, navigationLocked = false, actionsTarget, reviewActionTarget }: {
  order: LabServiceOrder; embedded?: boolean; page?: number; onPageChange?: (page: number) => void
  tubeShipments?: SampleShipmentWorkflow[]
  tubeContext?: SampleTubeListContext
  navigationLocked?: boolean
  actionsTarget?: HTMLElement | null
  reviewActionTarget?: HTMLElement | null
}) {
  const __customerText = useCustomerText()

  const cache = useQueryClient()
  const { allowed: canViewReceipt, sampleReceipts, sampleMatches, receiptState } = useSourceSampleShipments(order.id)
  const [localPage, setLocalPage] = useState(0)
  const [tubeNavigation, setTubeNavigation] = useState<{ activeKey: string | null; page?: number; expanded?: string }>({ activeKey: null })
  const [sample, setSample] = useState<LabSample | null | undefined>(undefined)
  const [dirtySources, setDirtySources] = useState<Set<string>>(new Set())
  const [savingSource, setSavingSource] = useState<string | null>(null)
  const entryLocked = savingSource !== null
  const hasUnsavedEntries = dirtySources.size > 0
  const [clearSample, setClearSample] = useState<LabSample | null>(null)
  const clearCancelRef = useRef<HTMLButtonElement>(null)
  const clearReturnRef = useRef<HTMLElement | null>(null)
  const [confirm, setConfirm] = useState<'import' | 'finalize' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ value: LabSampleImportPreview; version: number } | null>(null)
  const [confirmedVersion, setConfirmedVersion] = useState<number | null>(null)
  const reviewSummaryRef = useRef<HTMLParagraphElement>(null)
  const refresh = async (saved?: LabServiceOrder) => {
    if (saved) cache.setQueryData(['lab-service-order', order.id], saved)
    await Promise.all(['lab-service-order', 'lab-service-orders', 'sample-shipments'].map(key => cache.invalidateQueries({ queryKey: [key] })))
  }
  const change = useMutation({
    mutationFn: async (action: { kind: 'clear'; sample: LabSample } | { kind: 'finalize' } | { kind: 'import' }) => {
      if (action.kind === 'clear') return deleteLabSample(order.id, action.sample.id, action.sample.version)
      if (action.kind === 'finalize') return finalizeLabSampleRoster(order.id, order.version, true)
      if (order.samples.length > 0) throw new Error('Clear all saved sample details before importing a new list.')
      if (!preview || preview.version !== order.version) throw new Error('The Job changed. Preview the file again before replacing the list.')
      return confirmLabSampleImport(order.id, preview.value.previewId, preview.version)
    },
    onSuccess: async (saved, action) => {
      setClearSample(null); setConfirm(null); setPreview(null); setFile(null); setConfirmedVersion(null)
      await refresh(saved)
      if (action.kind === 'clear') {
        const groupIndex = saved.sourceGroups.findIndex(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(action.sample.biologicalSource))
        window.setTimeout(() => document.getElementById(`${order.id}-sample-source-${groupIndex}`)?.closest('section')?.querySelector('input')?.focus(), 0)
      }
    },
    onError: () => refresh(),
  })
  const upload = useMutation({
    mutationFn: async () => {
      if (order.samples.length > 0) throw new Error('Clear all saved sample details before importing a new list.')
      const version = order.version
      return { value: await previewLabSampleImport(order.id, file!, version), version }
    },
    onSuccess: value => setPreview(value),
  })
  const template = useMutation({ mutationFn: () => downloadLabSampleTemplate(order.id, order.orderNumber) })
  const sampleWorkOpen = sample !== undefined || clearSample !== null || confirm !== null || change.isPending || upload.isPending || hasUnsavedEntries || entryLocked
  useBlocker({ shouldBlockFn: () => sampleWorkOpen, enableBeforeUnload: () => sampleWorkOpen, disabled: !sampleWorkOpen })
  const failure = change.error ?? upload.error ?? template.error
  const sourceGroups = groupSampleRows(order)
  const identifyingSamples = order.canEditSamples && (order.samples.length < order.requestedSpecimenCount || hasUnsavedEntries || entryLocked)
  const pageCount = identifyingSamples ? 1 : Math.max(1, Math.ceil(order.samples.length / samplePageSize))
  const activeItem = tubeContext?.activeItem
  const activeKey = activeItem ? `${tubeContext.shipment.id}:${activeItem.tubeSlotId ?? activeItem.shipmentItemId}` : null
  const activeSampleIndex = activeItem ? sourceGroups.flatMap(group => group.samples).findIndex(value => value.id === activeItem.submittedSpecimenId) : -1
  const activeSamplePage = activeSampleIndex < 0 ? null : Math.floor(activeSampleIndex / samplePageSize)
  if (tubeNavigation.activeKey !== activeKey) {
    setTubeNavigation(previous => ({ activeKey, page: activeSamplePage ?? previous.page, expanded: activeItem?.submittedSpecimenId ?? previous.expanded }))
  }
  const requestedPage = tubeNavigation.page ?? page ?? localPage
  const visiblePage = Math.min(Math.max(0, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0), pageCount - 1)
  const pageGroups = identifyingSamples ? sourceGroups.map((group, groupIndex) => ({ ...group, groupIndex, visibleSamples: group.samples, continued: false })) : paginateSampleGroups(sourceGroups, visiblePage)
  const changePage = (nextPage: number) => {
    if (navigationLocked || tubeContext?.pending) return
    setLocalPage(nextPage)
    if (tubeShipments) setTubeNavigation(previous => ({ ...previous, page: nextPage }))
    // Reviewing rows must not navigate away from an entered barcode.
    if (!activeItem) onPageChange?.(nextPage)
  }
  const shipments = tubeShipments?.map(shipment => shipment.id === tubeContext?.shipment.id ? tubeContext.shipment : shipment) ?? []
  const tubeRows = shipments.flatMap(shipment => shipment.crosswalk.map(item => ({ shipment, item })))
  const knownSamples = new Set(order.samples.map(value => value.id))
  const unmatchedRows = tubeRows.filter(row => !knownSamples.has(row.item.submittedSpecimenId))
  const renderTube = ({ shipment, item }: typeof tubeRows[number]) => shipment.id === tubeContext?.shipment.id
    ? tubeContext.renderTube(item)
    : <SampleTubeRow key={`${shipment.id}:${item.tubeSlotId ?? item.shipmentItemId}`} item={item} containerLabel={shipment.isPackingPool ? "Awaiting container" : [shipment.assignedContainer?.kitNumber, shipment.shipmentNumber].filter(Boolean).join(' · ')} />
  const totalTubes = order.samples.reduce((total, value) => total + value.quantity, 0)
  const hasSourceIssues = sourceGroups.some(group => group.unmatched || group.samples.length > group.specimenCount)
  const totalExceeded = order.samples.length > order.requestedSpecimenCount
  const allocatedRuns = order.samples.reduce((sum, sample) => sum + (sample.sequencingRunCount ?? 1), 0)
  const purchasedRuns = order.requestedSequencingRunCount ?? order.requestedSpecimenCount
  const exactComposition = hasCompleteSampleIdentification(order) && allocatedRuns === purchasedRuns
  const readyForReview = exactComposition && !hasUnsavedEntries && !entryLocked
  const finalizeAction = <Button type="button" disabled={navigationLocked || change.isPending || !readyForReview || !order.canFinalizeSamples}
    onClick={() => { setConfirm('finalize'); setConfirmedVersion(null) }}><CustomerText message="m_e81c648b8da6" /></Button>
  const rosterHelpId = `${order.id}-sample-roster-help`
  const actions = order.canEditSamples ? readyForReview ? finalizeAction : <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline" disabled={navigationLocked} aria-label={__customerText('m_e06ed54d9c35')}><CustomerText message="m_ff8059dc6752" /><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-2rem)]">
            <DropdownMenuItem disabled={template.isPending || entryLocked} onSelect={() => template.mutate()}><CustomerText message="m_67f46a1d5a5d" /></DropdownMenuItem>
            <DropdownMenuItem disabled={order.samples.length > 0 || hasUnsavedEntries || entryLocked} onSelect={() => { setConfirm('import'); setPreview(null); setFile(null) }}><CustomerText message="m_d8c79f209f9a" /></DropdownMenuItem>
            <DropdownMenuItem disabled={change.isPending || entryLocked || hasUnsavedEntries || !exactComposition || !order.canFinalizeSamples} onSelect={() => { setConfirm('finalize'); setConfirmedVersion(null) }}><CustomerText message="m_e81c648b8da6" /></DropdownMenuItem>
          </DropdownMenuContent>
        </ActionMenu> : null
  const Container = embedded ? 'div' : Card
  const Content = embedded ? 'div' : CardContent
  return <Container id={embedded ? undefined : "samples-and-shipping"}>
    {!embedded ? <CardHeader><CardTitle><CustomerText message="m_74607a548dd6" /></CardTitle>{actions ? <CardAction>{actions}</CardAction> : null}<CardDescription>{order.sampleRosterFinalizedAt ? <CustomerSourceText source={"Review the saved tube matches and laboratory receipt for every sample in this Job."} /> : order.canEditSamples ? "Identify each accepted sample below, then review and finalize the list before preparing your shipment." : __customerText('m_ac83736c02ae')}</CardDescription></CardHeader> : null}
    {embedded && actionsTarget ? createPortal(actions, actionsTarget) : null}
    {order.canEditSamples && reviewActionTarget ? createPortal(finalizeAction, reviewActionTarget) : null}
    <Content className="space-y-4">
      {embedded && !actionsTarget && actions ? <div className="flex justify-end">{actions}</div> : null}
      <p className={`flex items-center gap-2 text-sm${totalExceeded ? ' font-medium text-destructive' : ''}`}>
        {exactComposition ? <CircleCheck className="size-4 shrink-0 text-[var(--status-ready)]" role="img" aria-label={__customerText('m_a93b3965bcd7')} /> : null}
        <span>{order.samples.length} of {order.requestedSpecimenCount} <CustomerText message="m_836f9f2dd9f7" />{allocatedRuns} of {purchasedRuns} <CustomerText message="m_c595e1e7b5da" />{order.sampleRosterFinalizedAt ? <CustomerSourceText source={" · Finalized"} /> : ''}</span>
      </p>
      {order.samples.length > 0 && allocatedRuns !== purchasedRuns ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_21eb5bd438a1" />{purchasedRuns} <CustomerText message="m_407eb8d5b54e" /></p> : null}
      {hasSourceIssues || totalExceeded ? <Alert variant="destructive" id={rosterHelpId}><AlertTitle><CustomerText message="m_84225f5e3a15" /></AlertTitle><AlertDescription><CustomerText message="m_3e04d03c6e87" /></AlertDescription></Alert> : null}
      {failure ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_e253388347d7" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(failure, 'Review the current Job and try again.')} />}</AlertDescription></Alert> : null}
      {order.canEditSamples && !readyForReview && (hasUnsavedEntries || order.samples.length > 0) ? <div className="space-y-2">
        {hasUnsavedEntries ? <p className="text-xs text-muted-foreground"><CustomerText message="m_6de534e03521" /></p> : null}
        {order.samples.length > 0 ? <p id={`${order.id}-sample-import-help`} className="text-xs text-muted-foreground"><CustomerText message="m_0d102ca02fe8" /></p> : null}
      </div> : null}
      {activeItem && activeSamplePage !== null && (activeSamplePage !== visiblePage || tubeNavigation.expanded !== activeItem.submittedSpecimenId) ? <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground"><CustomerText message="m_4421394c1e06" />{activeItem.customerSampleId}<CustomerText message="m_042710a33c8f" />{activeItem.tubeOrdinal ?? 1}.</p>
        <Button variant="outline" size="sm" disabled={navigationLocked || tubeContext?.pending} onClick={() => { setTubeNavigation({ activeKey, page: activeSamplePage, expanded: activeItem.submittedSpecimenId }); tubeContext?.focusActiveTube() }}><CustomerText message="m_e12a3860e129" /></Button>
      </div> : null}
      <div role="region" aria-label={__customerText('m_7beb9611589c')} className="space-y-4">
      {pageGroups.map(group => {
        const excess = group.samples.length - group.specimenCount
        const groupHasIssue = group.unmatched || excess > 0
        const headingId = `${order.id}-sample-source-${group.groupIndex}`
        return <section key={group.id} aria-labelledby={headingId}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
            <h3 id={headingId} className="min-w-0 wrap-anywhere font-medium">{group.biologicalSource || 'Missing biological source'}{group.continued ? <CustomerSourceText source={" (continued)"} /> : ''}</h3>
            <div className="ml-auto flex shrink-0 items-center gap-3">
            <span id={`${headingId}-count`} className={`inline-flex items-center gap-1.5${groupHasIssue ? ' font-medium text-destructive' : ' text-muted-foreground'}`}>
              {groupHasIssue ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              {!groupHasIssue && group.specimenCount > 0 && group.samples.length === group.specimenCount ? <CircleCheck className="size-3.5 shrink-0 text-[var(--status-ready)]" role="img" aria-label={__customerText('m_6d450c6f61a8', { p0: String(group.biologicalSource) })} /> : null}
              {group.samples.length} of {group.specimenCount} {group.specimenCount === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')}
            </span>

            </div>
          </div>
          {groupHasIssue ? <p className="px-3 pt-2 text-xs text-destructive">{group.unmatched ? <CustomerSourceText source={"This source is not in the accepted list. Choose an accepted source for these samples or remove them."} /> : __customerText('m_c1d2882beffc', { p0: String(excess), p1: String(excess === 1 ? 'sample' : 'samples'), p2: String(excess === 1 ? 'entry' : 'entries') })}</p> : null}
          <ul className="divide-y px-3">
        {group.visibleSamples.map(value => {
          const receipt = sampleReceipts.get(value.id)?.counts
          const matches = sampleMatches.get(value.id)
          const tubes = tubeRows.filter(row => row.item.submittedSpecimenId === value.id).sort((first, second) => (first.item.tubeOrdinal ?? 1) - (second.item.tubeOrdinal ?? 1))
          const expanded = tubeNavigation.expanded === value.id
          const tubeListId = `${order.id}-sample-tubes-${value.id}`
          const showMatching = Boolean(order.sampleRosterFinalizedAt && canViewReceipt)
          const showLabProgress = !tubeShipments || Boolean(value.accessionId || value.status !== 'Expected' || receipt && receipt.received > 0 || tubes.some(row => row.shipment.shippedAt))
          return <li key={value.id} className="space-y-2 py-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 text-sm leading-5 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
              {tubeShipments && tubes.length > 0 ? <Button type="button" variant="ghost" size="sm" className="h-auto w-full min-w-0 items-start justify-start px-1 py-1 text-left text-sm leading-5 font-medium whitespace-normal" aria-label={__customerText('m_480b1abdc55a', { p0: String(value.customerSampleId) })} aria-expanded={expanded} aria-controls={tubeListId} disabled={navigationLocked || tubeContext?.pending} onClick={() => setTubeNavigation(previous => ({ ...previous, expanded: expanded ? undefined : value.id }))}>
                {expanded ? <ChevronDown aria-hidden="true" className="mt-0.5 shrink-0" /> : <ChevronRight aria-hidden="true" className="mt-0.5 shrink-0" />}<span className="wrap-anywhere">{value.customerSampleId}</span><span className="sr-only"> <CustomerText message="m_0f4552851513" /></span>
              </Button> : <span className="min-w-0 wrap-anywhere px-1 py-1 font-medium">{value.customerSampleId}</span>}
              <div className="col-start-1 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 py-1 text-muted-foreground sm:col-start-2 sm:row-start-1">
                {showMatching ? <span>{receiptState === 'loading' ? <CustomerSourceText source={"Matching: Checking…"} /> : receiptState !== 'ready' || !matches ? "Matching: Not available" : __customerText('m_d6e0e53f1e3e', { p0: String(matches.matched), p1: String(matches.total), p2: String(matches.total === 1 ? 'tube' : 'tubes') })}</span> : <span>{value.quantity} {value.quantity === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')}</span>}
                {value.accessionId ? <span className="wrap-anywhere"><CustomerText message="m_acd7ea857c4c" />{value.accessionId}</span> : null}
                {showLabProgress && (value.status !== 'Expected' || order.sampleRosterFinalizedAt) ? <OrderStatusBadge status={value.status} /> : null}
                {showMatching && showLabProgress ? <span><CustomerText message="m_99bb078d2e27" />{receiptState === 'loading' ? <CustomerSourceText source={"Checking…"} /> : receiptState !== 'ready' || !receipt ? "Not available" : __customerText('m_17a8b3de8ae1', { p0: String(receipt.received), p1: String(receipt.total), p2: String(receipt.total === 1 ? 'tube' : 'tubes') })}</span> : null}
              </div>
              {order.canEditSamples && !order.authorizedSampleIds?.includes(value.id) ? (
                <div className="col-start-2 row-start-1 justify-self-end sm:col-start-3"><ActionMenu>
                  <DropdownMenuTrigger asChild><Button id={`${order.id}-${value.id}-sample-actions`} type="button" size="sm" variant="outline" aria-label={__customerText('m_57eae120ccf9', { p0: String(value.customerSampleId) })}><CustomerText message="m_ff8059dc6752" /><ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 max-w-[calc(100vw-2rem)]" aria-labelledby={`${order.id}-${value.id}-sample-actions-label`}>
                    <DropdownMenuLabel id={`${order.id}-${value.id}-sample-actions-label`} className="wrap-anywhere"><CustomerText message="m_e589f8643ea5" />{value.customerSampleId}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {order.canEditSamples ? <DropdownMenuItem disabled={entryLocked || hasUnsavedEntries || change.isPending} onSelect={() => setSample(value)}><Pencil aria-hidden="true" /><CustomerText message="m_dfd1d481204f" /></DropdownMenuItem> : null}
                    <DropdownMenuItem disabled={entryLocked || hasUnsavedEntries || change.isPending} onSelect={() => { clearReturnRef.current = document.getElementById(`${order.id}-${value.id}-sample-actions`); change.reset(); setClearSample(value) }}><Eraser aria-hidden="true" /><CustomerText message="m_97cba6930759" /></DropdownMenuItem>
                  </DropdownMenuContent>
                </ActionMenu></div>
              ) : null}
            </div>
            {tubeShipments && tubes.length > 0 ? <div id={tubeListId} hidden={!expanded} className="rounded-md border"><ul aria-label={__customerText('m_1f46b733c543', { p0: String(value.customerSampleId) })} className="divide-y">{expanded ? tubes.map(renderTube) : null}</ul></div> : null}
            {value.tenantSafeReason ? <p className="wrap-anywhere text-sm">{value.tenantSafeReason}</p> : null}
          </li>
        })}
          </ul>
          {order.canEditSamples && !group.unmatched ? <SampleIdentificationRows key={`${order.id}-${group.id}`} order={order}
            source={group.biologicalSource} expectedCount={group.specimenCount} savedCount={group.samples.length}
            disabled={entryLocked || change.isPending || sample !== undefined || clearSample !== null || confirm !== null || navigationLocked}
            onDirtyChange={dirty => setDirtySources(previous => { const next = new Set(previous); if (dirty) next.add(group.id); else next.delete(group.id); return next })}
            onBusyChange={busy => setSavingSource(busy ? group.id : null)} onSaved={refresh} /> : null}
        </section>
      })}
      </div>
      {pageCount > 1 ? <nav aria-label={__customerText('m_9d87a8460366')} className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground"><CustomerText message="m_25d51a4ef1d2" />{visiblePage * samplePageSize + 1}–{Math.min((visiblePage + 1) * samplePageSize, order.samples.length)} of {order.samples.length}</p>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={visiblePage === 0 || change.isPending || navigationLocked || tubeContext?.pending} onClick={() => changePage(visiblePage - 1)}><CustomerText message="m_e4c4ce3e9fa8" /></Button><Button variant="outline" size="sm" disabled={visiblePage === pageCount - 1 || change.isPending || navigationLocked || tubeContext?.pending} onClick={() => changePage(visiblePage + 1)}><CustomerText message="m_49c7f8cb9ceb" /></Button></div>
      </nav> : null}
      {unmatchedRows.length ? <section aria-label={__customerText('m_d089a24f9272')} className="space-y-2"><h3 className="font-medium text-destructive"><CustomerText message="m_d089a24f9272" /></h3><p className="text-sm text-muted-foreground"><CustomerText message="m_96a718d266e1" /></p><ul className="divide-y rounded-md border">{unmatchedRows.map(renderTube)}</ul></section> : null}
      {!embedded ? <RelatedSampleShipments sourceId={order.id} showSampleReceiptProgress={false} /> : null}
      {sample !== undefined ? <LabSampleDialog open order={order} sample={sample} onOpenChange={open => { if (!open) setSample(undefined) }} onSaved={async saved => { setSample(undefined); await refresh(saved) }} /> : null}
      <Dialog open={clearSample !== null} onOpenChange={open => { if (!open && !change.isPending) setClearSample(null) }}>
        <DialogContent showCloseButton={!change.isPending} aria-busy={change.isPending}
          onOpenAutoFocus={event => { event.preventDefault(); clearCancelRef.current?.focus() }}
          onCloseAutoFocus={event => { event.preventDefault(); if (clearReturnRef.current?.isConnected) clearReturnRef.current.focus() }}>
          <DialogHeader>
            <DialogTitle><CustomerText message="m_cf258ecee5f4" /></DialogTitle>
            <DialogDescription><CustomerText message="m_dbd776700c85" /><span className="font-medium wrap-anywhere">{clearSample?.customerSampleId}</span> <CustomerText message="m_5f3b68b0b3cf" /></DialogDescription>
          </DialogHeader>
          {change.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(change.error, 'Sample details could not be cleared. Review the current list and try again.')} />}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button ref={clearCancelRef} type="button" variant="outline" disabled={change.isPending} onClick={() => setClearSample(null)}><CustomerText message="m_19766ed6ccb2" /></Button>
            <Button type="button" disabled={change.isPending || !clearSample || navigationLocked} onClick={() => { if (clearSample) change.mutate({ kind: 'clear', sample: clearSample }) }}>{change.isPending ? <CustomerSourceText source={"Clearing…"} /> : __customerText('m_97cba6930759')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirm !== null} onOpenChange={open => { if (!open && !change.isPending && !upload.isPending) setConfirm(null) }}><DialogContent className={confirm === 'import' ? "max-w-3xl" : "max-w-xl"} onOpenAutoFocus={event => {
        if (confirm === 'finalize' && reviewSummaryRef.current) {
          event.preventDefault()
          reviewSummaryRef.current.focus({ preventScroll: true })
        }
      }}><DialogHeader><DialogTitle>{confirm === 'import' ? <CustomerSourceText source={"Import sample list"} /> : __customerText('m_d884a62190dd')}</DialogTitle><DialogDescription>{confirm === 'import' ? <CustomerSourceText source={"Preview the Job-specific CSV. Confirming replaces the editable sample list as one operation; previewing makes no changes."} /> : __customerText('m_2107cc12f849', { p0: String(order.requestedSpecimenCount) })}</DialogDescription></DialogHeader>
        {failure ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(failure, 'Review the current Job and try again.')} />}</AlertDescription></Alert> : null}
        {confirm === 'import' ? <div className="space-y-3"><Label htmlFor="sample-roster-csv"><RequiredFieldName><CustomerText message="m_545ebd298675" /></RequiredFieldName></Label><Input id="sample-roster-csv" type="file" accept=".csv,text/csv" disabled={upload.isPending || change.isPending} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); upload.reset() }} /><Button variant="outline" disabled={!file || upload.isPending || change.isPending} onClick={() => upload.mutate()}><CustomerText message="m_6ece463bdce4" /></Button>{preview ? <><p>{preview.value.validRowCount} <CustomerText message="m_f04125f52b54" />{preview.value.blankRowCount} <CustomerText message="m_4b03fedfd245" /></p>{preview.version !== order.version ? <p role="alert"><CustomerText message="m_d28b965c4bbf" /></p> : null}{preview.value.errors.length ? <ul role="alert" className="text-sm text-destructive">{preview.value.errors.map((error, index) => <li key={index}><CustomerText message="m_248dda403b01" />{error.rowNumber}, {error.column}: {<CustomerSourceText source={error.message} />}</li>)}</ul> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th><CustomerText message="m_1860caa4e4b3" /></th><th><CustomerText message="m_62cda8311410" /></th><th><CustomerText message="m_9896e020cb56" /></th><th><CustomerText message="m_1eb1f1e140ea" /></th></tr></thead><tbody>{preview.value.rows.map(row => <tr key={row.rowNumber}><td>{row.customerSampleId}</td><td>{row.biologicalSource}</td><td>{row.tubeCount}</td><td>{row.sequencingRunCount ?? 1}</td></tr>)}</tbody></table></div>}</> : null}</div>
          : <div className="space-y-4">
            <p ref={reviewSummaryRef} tabIndex={-1} className="rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">{order.samples.length} {order.samples.length === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')} · {totalTubes} {totalTubes === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')}</p>
            <div className="space-y-3">{sourceGroups.map((group, index) => {
              const headingId = `${order.id}-review-source-${index}`
              return <section key={group.id} aria-labelledby={headingId}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
                  <h3 id={headingId} className="min-w-0 wrap-anywhere font-medium">{group.biologicalSource || 'Missing biological source'}</h3>
                  <span className="shrink-0 text-xs text-muted-foreground">{group.samples.length} of {group.specimenCount} {group.specimenCount === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')}</span>
                </div>
                <ul className="divide-y px-3 text-sm">{group.samples.map(value => <li key={value.id} className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="min-w-0 wrap-anywhere font-medium">{value.customerSampleId}</span>
                  <span className="shrink-0 text-muted-foreground">{value.quantity} {value.quantity === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')}</span>
                </li>)}</ul>
              </section>
            })}</div>
            <p className="text-sm"><CustomerText message="m_c60d449cb1d2" /></p>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmedVersion === order.version} disabled={change.isPending} onChange={event => setConfirmedVersion(event.target.checked ? order.version : null)} className="mt-1" /><RequiredFieldName><CustomerText message="m_8acb921b1dbe" /></RequiredFieldName></label>
          </div>}
        <RequiredDialogFooter><Button variant="outline" disabled={change.isPending || upload.isPending} onClick={() => setConfirm(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button disabled={change.isPending || upload.isPending || (confirm === 'import' ? order.samples.length > 0 || !preview || preview.version !== order.version || preview.value.errors.length > 0 || !preview.value.validRowCount : confirmedVersion !== order.version || !order.canFinalizeSamples || !exactComposition)} onClick={() => change.mutate({ kind: confirm === 'import' ? 'import' : 'finalize' })}>{change.isPending ? <CustomerSourceText source={"Saving…"} /> : confirm === 'import' ? "Replace draft sample list" : __customerText('m_d884a62190dd')}</Button></RequiredDialogFooter>
      </DialogContent></Dialog>
    </Content>
  </Container>
}

function paginateSampleGroups(groups: ReturnType<typeof groupSampleRows>, page: number) {
  let offset = 0
  return groups.flatMap((group, groupIndex) => {
    const start = Math.max(0, page * samplePageSize - offset)
    const end = Math.min(group.samples.length, (page + 1) * samplePageSize - offset)
    offset += group.samples.length
    if (group.samples.length === 0 && page === 0) return [{ ...group, groupIndex, visibleSamples: [], continued: false }]
    return start < end ? [{ ...group, groupIndex, visibleSamples: group.samples.slice(start, end), continued: start > 0 }] : []
  })
}
