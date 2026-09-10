import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, CircleCheck, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { useRef, useState, type ReactNode } from 'react'
import { confirmLabSampleImport, deleteLabSample, downloadLabSampleTemplate, finalizeLabSampleRoster, getOrderErrorMessage, previewLabSampleImport, type LabSample, type LabSampleImportPreview, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabSampleDialog } from './LabSampleDialog'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { SampleTubeListContext } from '#/features/sample-shipping/SampleTubeScanner'
import { SampleTubeRow } from '#/features/sample-shipping/SampleTubeRow'
import { OrderStatusBadge } from './OrderStatusBadge'
import { RelatedSampleShipments } from '#/features/sample-shipping/RelatedSampleShipments'
import { useSourceSampleShipments } from '#/features/sample-shipping/use-source-sample-shipments'
import { getSampleSourceGroups, normalizeBiologicalSource } from './sample-source-capacity'

const sampleIdCollator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' })
const samplePageSize = 10

export function LabJobSamplesPanel({ order, embedded = false, page, onPageChange, tubeShipments, tubeContext, navigationLocked = false }: {
  order: LabServiceOrder; embedded?: boolean; page?: number; onPageChange?: (page: number) => void
  tubeShipments?: SampleShipmentWorkflow[]
  tubeContext?: SampleTubeListContext
  navigationLocked?: boolean
}) {
  const cache = useQueryClient()
  const { allowed: canViewReceipt, sampleReceipts, sampleMatches, receiptState } = useSourceSampleShipments(order.id)
  const [localPage, setLocalPage] = useState(0)
  const [tubeNavigation, setTubeNavigation] = useState<{ activeKey: string | null; page?: number; expanded?: string }>({ activeKey: null })
  const [sample, setSample] = useState<LabSample | null | undefined>(undefined)
  const [addingSource, setAddingSource] = useState<string | undefined>(undefined)
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
    mutationFn: async (action: { kind: 'remove'; sample: LabSample } | { kind: 'finalize' } | { kind: 'import' }) => {
      if (action.kind === 'remove') return deleteLabSample(order.id, action.sample.id, action.sample.version)
      if (action.kind === 'finalize') return finalizeLabSampleRoster(order.id, order.version)
      if (order.samples.length > 0) throw new Error('Remove all samples before importing a new list.')
      if (!preview || preview.version !== order.version) throw new Error('The Job changed. Preview the file again before replacing the list.')
      return confirmLabSampleImport(order.id, preview.value.previewId, preview.version)
    },
    onSuccess: async saved => { setConfirm(null); setPreview(null); setFile(null); setConfirmedVersion(null); await refresh(saved) },
    onError: () => refresh(),
  })
  const upload = useMutation({
    mutationFn: async () => {
      if (order.samples.length > 0) throw new Error('Remove all samples before importing a new list.')
      const version = order.version
      return { value: await previewLabSampleImport(order.id, file!, version), version }
    },
    onSuccess: value => setPreview(value),
  })
  const template = useMutation({ mutationFn: () => downloadLabSampleTemplate(order.id, order.orderNumber) })
  const sampleWorkOpen = sample !== undefined || confirm !== null || change.isPending || upload.isPending
  useBlocker({ shouldBlockFn: () => sampleWorkOpen, enableBeforeUnload: () => sampleWorkOpen, disabled: !sampleWorkOpen })
  const legacyCleanup = order.canEdit && !order.placedAt && order.samples.length > 0
  const failure = change.error ?? upload.error ?? template.error
  const sourceGroups = groupSampleRows(order)
  const pageCount = Math.max(1, Math.ceil(order.samples.length / samplePageSize))
  const activeItem = tubeContext?.activeItem
  const activeKey = activeItem ? `${tubeContext.shipment.id}:${activeItem.tubeSlotId ?? activeItem.shipmentItemId}` : null
  const activeSampleIndex = activeItem ? sourceGroups.flatMap(group => group.samples).findIndex(value => value.id === activeItem.submittedSpecimenId) : -1
  const activeSamplePage = activeSampleIndex < 0 ? null : Math.floor(activeSampleIndex / samplePageSize)
  if (tubeNavigation.activeKey !== activeKey) {
    setTubeNavigation(previous => ({ activeKey, page: activeSamplePage ?? previous.page, expanded: activeItem?.submittedSpecimenId ?? previous.expanded }))
  }
  const requestedPage = tubeNavigation.page ?? page ?? localPage
  const visiblePage = Math.min(Math.max(0, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0), pageCount - 1)
  const pageGroups = paginateSampleGroups(sourceGroups, visiblePage)
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
    : <SampleTubeRow key={`${shipment.id}:${item.tubeSlotId ?? item.shipmentItemId}`} item={item} containerLabel={shipment.isPackingPool ? 'Awaiting container' : [shipment.assignedContainer?.kitNumber, shipment.shipmentNumber].filter(Boolean).join(' · ')} />
  const totalTubes = order.samples.reduce((total, value) => total + value.quantity, 0)
  const hasSourceIssues = sourceGroups.some(group => group.unmatched || group.samples.length > group.specimenCount)
  const totalExceeded = order.samples.length > order.requestedSpecimenCount
  const exactComposition = order.samples.length === order.requestedSpecimenCount
    && sourceGroups.length > 0
    && sourceGroups.every(group => !group.unmatched && group.samples.length === group.specimenCount)
  const rosterHelpId = `${order.id}-sample-roster-help`
  const Container = embedded ? 'div' : Card
  const Content = embedded ? 'div' : CardContent
  return <Container id={embedded ? undefined : 'samples-and-shipping'}>
    {!embedded ? <CardHeader><CardTitle>Samples and shipping</CardTitle><CardDescription>{order.sampleRosterFinalizedAt ? 'Review the saved tube matches and laboratory receipt for every sample in this Job.' : order.canEditSamples ? 'Enter exactly the accepted sample count and biological-source composition, then finalize the list before shipping.' : 'Place the configured standard order or accept the manual quote before entering the individual sample list. Shipping and laboratory work require finalization.'}</CardDescription></CardHeader> : null}
    <Content className="space-y-4">
      <p className={`flex items-center gap-2 text-sm${totalExceeded ? ' font-medium text-destructive' : ''}`}>
        {exactComposition ? <CircleCheck className="size-4 shrink-0 text-[var(--status-ready)]" role="img" aria-label="All sample counts are complete" /> : null}
        <span>{order.samples.length} of {order.requestedSpecimenCount} samples entered{order.sampleRosterFinalizedAt ? ' · Finalized' : ''}</span>
      </p>
      {hasSourceIssues || totalExceeded ? <Alert variant="destructive" id={rosterHelpId}><AlertTitle>Sample list needs attention</AlertTitle><AlertDescription>The sample list must match the accepted source counts before it can be finalized. Edit the affected samples or remove the extra entries below.</AlertDescription></Alert> : null}
      {failure ? <Alert variant="destructive"><AlertTitle>Sample list was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(failure, 'Review the current Job and try again.')}</AlertDescription></Alert> : null}
      {legacyCleanup ? <Alert><AlertTitle>Legacy draft samples</AlertTitle><AlertDescription>Remove these earlier sample rows before submitting for pricing. Enter the current list after accepting the quote.</AlertDescription></Alert> : null}
      {order.canEditSamples ? <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={template.isPending} onClick={() => template.mutate()}>Download CSV template</Button>
          <Button variant="outline" disabled={order.samples.length > 0} aria-describedby={order.samples.length > 0 ? `${order.id}-sample-import-help` : undefined} onClick={() => { setConfirm('import'); setPreview(null); setFile(null) }}>Import sample list</Button>
          {order.canFinalizeSamples || order.samples.length >= order.requestedSpecimenCount ? <Button disabled={change.isPending || !exactComposition || !order.canFinalizeSamples} aria-describedby={hasSourceIssues || totalExceeded ? rosterHelpId : undefined} onClick={() => { setConfirm('finalize'); setConfirmedVersion(null) }}>Review and finalize list</Button> : null}
        </div>
        {order.samples.length > 0 ? <p id={`${order.id}-sample-import-help`} className="text-xs text-muted-foreground">Remove all samples before importing a new list.</p> : null}
      </div> : null}
      {activeItem && activeSamplePage !== null && (activeSamplePage !== visiblePage || tubeNavigation.expanded !== activeItem.submittedSpecimenId) ? <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Your scan still applies to {activeItem.customerSampleId}, tube {activeItem.tubeOrdinal ?? 1}.</p>
        <Button variant="outline" size="sm" disabled={navigationLocked || tubeContext?.pending} onClick={() => { setTubeNavigation({ activeKey, page: activeSamplePage, expanded: activeItem.submittedSpecimenId }); tubeContext?.focusActiveTube() }}>Return to active tube</Button>
      </div> : null}
      <Tooltip.Provider delayDuration={300}>
      <div role="region" aria-label="Samples by biological source" className="space-y-4">
      {pageGroups.map(group => {
        const excess = group.samples.length - group.specimenCount
        const groupHasIssue = group.unmatched || excess > 0
        const headingId = `${order.id}-sample-source-${group.groupIndex}`
        return <section key={group.id} aria-labelledby={headingId}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
            <h3 id={headingId} className="min-w-0 wrap-anywhere font-medium">{group.biologicalSource || 'Missing biological source'}{group.continued ? ' (continued)' : ''}</h3>
            <div className="ml-auto flex shrink-0 items-center gap-3">
            <span id={`${headingId}-count`} className={`inline-flex items-center gap-1.5${groupHasIssue ? ' font-medium text-destructive' : ' text-muted-foreground'}`}>
              {groupHasIssue ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              {!groupHasIssue && group.specimenCount > 0 && group.samples.length === group.specimenCount ? <CircleCheck className="size-3.5 shrink-0 text-[var(--status-ready)]" role="img" aria-label={`${group.biologicalSource} sample count is complete`} /> : null}
              {group.samples.length} of {group.specimenCount} {group.specimenCount === 1 ? 'sample' : 'samples'}
            </span>
            {order.canEditSamples && !group.unmatched ? <Button type="button" size="sm" variant="outline"
              aria-label={`Add sample to ${group.biologicalSource}`} aria-describedby={`${headingId}-count`}
              disabled={change.isPending || group.samples.length >= group.specimenCount || order.samples.length >= order.requestedSpecimenCount}
              onClick={() => { setAddingSource(group.biologicalSource); setSample(null) }}><Plus aria-hidden="true" />Add</Button> : null}
            </div>
          </div>
          {groupHasIssue ? <p className="px-3 pt-2 text-xs text-destructive">{group.unmatched ? 'This source is not in the accepted list. Choose an accepted source for these samples or remove them.' : `${excess} extra ${excess === 1 ? 'sample' : 'samples'}. Edit the biological source or remove the extra ${excess === 1 ? 'entry' : 'entries'}.`}</p> : null}
          <ul className="divide-y px-3">
        {group.visibleSamples.map(value => {
          const receipt = sampleReceipts.get(value.id)?.counts
          const matches = sampleMatches.get(value.id)
          const tubes = tubeRows.filter(row => row.item.submittedSpecimenId === value.id)
          const expanded = tubeNavigation.expanded === value.id
          const tubeListId = `${order.id}-sample-tubes-${value.id}`
          const showLabProgress = !tubeShipments || Boolean(value.accessionId || value.status !== 'Expected' || receipt && receipt.received > 0 || tubes.some(row => row.shipment.shippedAt))
          return <li key={value.id} className="space-y-2 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {tubeShipments && tubes.length > 0 ? <Button type="button" variant="ghost" size="sm" className="h-auto min-w-0 justify-start px-1 py-1 font-medium whitespace-normal" aria-label={`${value.customerSampleId} tubes`} aria-expanded={expanded} aria-controls={tubeListId} disabled={navigationLocked || tubeContext?.pending} onClick={() => setTubeNavigation(previous => ({ ...previous, expanded: expanded ? undefined : value.id }))}>
                {expanded ? <ChevronDown aria-hidden="true" className="shrink-0" /> : <ChevronRight aria-hidden="true" className="shrink-0" />}<span className="wrap-anywhere">{value.customerSampleId}</span><span className="sr-only"> tubes</span>
              </Button> : <span className="min-w-0 wrap-anywhere font-medium">{value.customerSampleId}</span>}
              <span className="min-w-0 wrap-anywhere text-muted-foreground">
                {value.quantity} {value.quantity === 1 ? 'tube' : 'tubes'}
                {value.accessionId ? ` · Accession ${value.accessionId}` : ''}
              </span>
              {showLabProgress && (value.status !== 'Expected' || order.sampleRosterFinalizedAt) ? <OrderStatusBadge status={value.status} /> : null}
              {order.sampleRosterFinalizedAt && canViewReceipt ? <span className="text-muted-foreground">Matched: {receiptState === 'loading' ? 'Checking…' : receiptState !== 'ready' || !matches ? 'Not available' : `${matches.matched} of ${matches.total} ${matches.total === 1 ? 'tube' : 'tubes'}`}</span> : null}
              {order.sampleRosterFinalizedAt && canViewReceipt && showLabProgress ? <span className="text-muted-foreground">Receipt: {receiptState === 'loading' ? 'Checking…' : receiptState !== 'ready' || !receipt ? 'Not available' : `${receipt.received} of ${receipt.total} ${receipt.total === 1 ? 'tube' : 'tubes'} received`}</span> : null}
              {order.canEditSamples || legacyCleanup ? (
                <div className="ml-auto flex gap-2">
                  {order.canEditSamples ? <SampleRowAction label={`Edit sample ${value.customerSampleId}`} onClick={() => { setAddingSource(undefined); setSample(value) }}><Pencil aria-hidden="true" /></SampleRowAction> : null}
                  <SampleRowAction label={`Remove sample ${value.customerSampleId}`} disabled={change.isPending} onClick={() => { if (window.confirm(`Remove ${value.customerSampleId} from this sample list?`)) change.mutate({ kind: 'remove', sample: value }) }}><Trash2 aria-hidden="true" /></SampleRowAction>
                </div>
              ) : null}
            </div>
            {tubeShipments && tubes.length > 0 ? <div id={tubeListId} hidden={!expanded} className="rounded-md border"><ul aria-label={`Tubes for ${value.customerSampleId}`} className="divide-y">{expanded ? tubes.map(renderTube) : null}</ul></div> : null}
            {value.tenantSafeReason ? <p className="wrap-anywhere text-sm">{value.tenantSafeReason}</p> : null}
          </li>
        })}
          </ul>
        </section>
      })}
      </div>
      </Tooltip.Provider>
      {pageCount > 1 ? <nav aria-label="Sample pages" className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">Samples {visiblePage * samplePageSize + 1}–{Math.min((visiblePage + 1) * samplePageSize, order.samples.length)} of {order.samples.length}</p>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={visiblePage === 0 || change.isPending || navigationLocked || tubeContext?.pending} onClick={() => changePage(visiblePage - 1)}>Previous samples</Button><Button variant="outline" size="sm" disabled={visiblePage === pageCount - 1 || change.isPending || navigationLocked || tubeContext?.pending} onClick={() => changePage(visiblePage + 1)}>Next samples</Button></div>
      </nav> : null}
      {unmatchedRows.length ? <section aria-label="Tubes needing sample review" className="space-y-2"><h3 className="font-medium text-destructive">Tubes needing sample review</h3><p className="text-sm text-muted-foreground">These saved tube slots do not match the current sample list. Review their identities before continuing.</p><ul className="divide-y rounded-md border">{unmatchedRows.map(renderTube)}</ul></section> : null}
      {!embedded ? <RelatedSampleShipments sourceId={order.id} showSampleReceiptProgress={false} /> : null}
      {sample !== undefined ? <LabSampleDialog open order={order} sample={sample} biologicalSource={addingSource} onOpenChange={open => { if (!open) setSample(undefined) }} onSaved={async saved => { setSample(undefined); await refresh(saved) }} /> : null}
      <Dialog open={confirm !== null} onOpenChange={open => { if (!open && !change.isPending && !upload.isPending) setConfirm(null) }}><DialogContent className={confirm === 'import' ? 'max-w-3xl' : 'max-w-xl'} onOpenAutoFocus={event => {
        if (confirm === 'finalize' && reviewSummaryRef.current) {
          event.preventDefault()
          reviewSummaryRef.current.focus({ preventScroll: true })
        }
      }}><DialogHeader><DialogTitle>{confirm === 'import' ? 'Import sample list' : 'Finalize sample list'}</DialogTitle><DialogDescription>{confirm === 'import' ? 'Preview the Job-specific CSV. Confirming replaces the editable sample list as one operation; previewing makes no changes.' : `Review all ${order.requestedSpecimenCount} samples and source counts. Finalization locks this list and authorizes the laboratory and registered return kit.`}</DialogDescription></DialogHeader>
        {failure ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(failure, 'Review the current Job and try again.')}</AlertDescription></Alert> : null}
        {confirm === 'import' ? <div className="space-y-3"><Label htmlFor="sample-roster-csv"><RequiredFieldName>Sample CSV</RequiredFieldName></Label><Input id="sample-roster-csv" type="file" accept=".csv,text/csv" disabled={upload.isPending || change.isPending} onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); upload.reset() }} /><Button variant="outline" disabled={!file || upload.isPending || change.isPending} onClick={() => upload.mutate()}>Preview CSV</Button>{preview ? <><p>{preview.value.validRowCount} valid samples · {preview.value.blankRowCount} blank rows</p>{preview.version !== order.version ? <p role="alert">The Job changed. Preview the CSV again.</p> : null}{preview.value.errors.length ? <ul role="alert" className="text-sm text-destructive">{preview.value.errors.map((error, index) => <li key={index}>Row {error.rowNumber}, {error.column}: {error.message}</li>)}</ul> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Sample ID</th><th>Biological source</th><th>Tubes</th></tr></thead><tbody>{preview.value.rows.map(row => <tr key={row.rowNumber}><td>{row.customerSampleId}</td><td>{row.biologicalSource}</td><td>{row.tubeCount}</td></tr>)}</tbody></table></div>}</> : null}</div>
          : <div className="space-y-4">
            <p ref={reviewSummaryRef} tabIndex={-1} className="rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">{order.samples.length} {order.samples.length === 1 ? 'sample' : 'samples'} · {totalTubes} {totalTubes === 1 ? 'tube' : 'tubes'}</p>
            <div className="space-y-3">{sourceGroups.map((group, index) => {
              const headingId = `${order.id}-review-source-${index}`
              return <section key={group.id} aria-labelledby={headingId}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
                  <h3 id={headingId} className="min-w-0 wrap-anywhere font-medium">{group.biologicalSource || 'Missing biological source'}</h3>
                  <span className="shrink-0 text-xs text-muted-foreground">{group.samples.length} of {group.specimenCount} {group.specimenCount === 1 ? 'sample' : 'samples'}</span>
                </div>
                <ul className="divide-y px-3 text-sm">{group.samples.map(value => <li key={value.id} className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="min-w-0 wrap-anywhere font-medium">{value.customerSampleId}</span>
                  <span className="shrink-0 text-muted-foreground">{value.quantity} {value.quantity === 1 ? 'tube' : 'tubes'}</span>
                </li>)}</ul>
              </section>
            })}</div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmedVersion === order.version} disabled={change.isPending} onChange={event => setConfirmedVersion(event.target.checked ? order.version : null)} className="mt-1" /><RequiredFieldName>I confirm this exact sample list contains no patient identifiers or PHI.</RequiredFieldName></label>
          </div>}
        <RequiredDialogFooter><Button variant="outline" disabled={change.isPending || upload.isPending} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={change.isPending || upload.isPending || (confirm === 'import' ? order.samples.length > 0 || !preview || preview.version !== order.version || preview.value.errors.length > 0 || !preview.value.validRowCount : confirmedVersion !== order.version || !order.canFinalizeSamples || !exactComposition)} onClick={() => change.mutate({ kind: confirm === 'import' ? 'import' : 'finalize' })}>{change.isPending ? 'Saving…' : confirm === 'import' ? 'Replace draft sample list' : 'Finalize sample list'}</Button></RequiredDialogFooter>
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

function groupSampleRows(order: LabServiceOrder) {
  const accepted = getSampleSourceGroups(order).map(group => ({ ...group, unmatched: false }))
  const acceptedSources = new Set(accepted.map(group => normalizeBiologicalSource(group.biologicalSource)))
  const unmatched = new Map<string, typeof accepted[number]>()
  for (const sample of order.samples) {
    const source = normalizeBiologicalSource(sample.biologicalSource)
    if (acceptedSources.has(source)) continue
    let group = unmatched.get(source)
    if (!group) {
      group = { id: `unmatched-${source}`, biologicalSource: sample.biologicalSource, specimenCount: 0, samples: [], unmatched: true }
      unmatched.set(source, group)
    }
    group.samples.push(sample)
  }
  return [...accepted, ...unmatched.values()].map(group => ({
    ...group,
    samples: [...group.samples].sort((first, second) => sampleIdCollator.compare(first.customerSampleId, second.customerSampleId)),
  }))
}

function SampleRowAction({ label, disabled, onClick, children }: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <Button type="button" size="icon-sm" variant="outline" aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content sideOffset={6} className="z-50 max-w-[min(20rem,calc(100vw-2rem))] wrap-anywhere rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
        {label}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
}
