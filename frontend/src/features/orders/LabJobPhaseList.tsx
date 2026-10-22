import { EmptyState } from '#/components/ui/content-state'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { RecordLink } from '#/components/ui/record-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LabPhase, LabPhasePlan } from '#/api/lab-phases'
import type { LabSampleTubeWorkspace, LabServiceOrder } from '#/api/order-management'
import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
import { cn } from '#/lib/utils'
import { customerStage, phaseProgress } from './lab-phase-progress'
import { humanizeStatus } from './OrderStatusBadge'
import { phaseShippingProgress } from './lab-phase-shipping'
import { SpecimenHolds } from './SpecimenHolds'
import { customerSpecimenHoldsEnabled } from './use-specimen-holds'
import { hasMultipleLabPhases, labSampleCount } from './lab-job-presentation'
import { LabPhaseSampleProgress } from './LabPhaseSampleProgress'
import { LabJobPhaseActions, labJobPhaseActions } from './LabJobPhaseActions'

export type LabJobPhaseTracking = {
  shipments: SampleShipmentWorkflow[]; shippingReady: boolean; pairs?: LabSampleTubeWorkspace; requests?: TransportationKitRequest[]
  expandedPhaseId?: string; onExpand: (id?: string) => void; onResults: (phaseId: string) => void
  disabled: boolean; onHoldModalChange: (open: boolean) => void
}
const rowGrid = 'grid gap-x-4 gap-y-3 md:grid-cols-[minmax(9rem,1.3fr)_4rem_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_5rem]'
export function LabJobPhaseList({ order, plan, tracking, canCancel, onCancel, singlePhaseActionsInHeader = false }: {
  order: LabServiceOrder; plan: LabPhasePlan; tracking: LabJobPhaseTracking
  canCancel: boolean; onCancel: (phase: LabPhase) => void
  singlePhaseActionsInHeader?: boolean
}) {
  const __customerText = useCustomerText()

  const phases = [...plan.phases].sort((a, b) => a.position - b.position)
  const single = !hasMultipleLabPhases(order, plan) && phases.length === 1
  const knownShipmentIds = new Set<string>()
  return <div>
    {!single ? <div aria-hidden="true" className={cn(rowGrid, 'hidden border-b px-3 pb-2 text-xs font-bold text-muted-foreground md:grid')}>
      {['Phase', 'Samples', 'Shipping', 'Physical receipt', 'Laboratory', 'Results'].map(label => <span key={label}>{label}</span>)}
    </div> : null}
    <div className="divide-y">{phases.map(phase => {
      const members = order.samples.filter(sample => sample.phaseId === phase.id)
      const phaseSamples = plan.samples.filter(sample => sample.phaseId === phase.id)
      const sampleIds = [...new Set([...members.map(s => s.id), ...phaseSamples.map(s => s.id), ...phase.sampleIds])]
      const ids = new Set(sampleIds)
      const shipments = tracking.shipments.filter(shipment => !shipment.isPackingPool && shipment.crosswalk.length > 0 && shipment.crosswalk.every(row => ids.has(row.submittedSpecimenId)))
      shipments.forEach(shipment => knownShipmentIds.add(shipment.id))
      const activeShipments = shipments.filter(s => s.status !== 'Cancelled')
      const sent = activeShipments.filter(s => s.shippedAt).length
      const progress = phaseShippingProgress(phase, order, tracking.requests ?? [], tracking.pairs, tracking.shipments)
      const shippingStatus = ['Cancelled', 'Superseded'].includes(phase.lifecycle) ? humanizeStatus(phase.lifecycle)
        : !tracking.shippingReady ? 'Checking shipments…'
        : progress.allSent || !order.usesPairedPreparation && phase.containerCount > 0 && phase.sentContainers === phase.containerCount ? 'Sent'
        : sent > 0 ? `${sent} of ${activeShipments.length} shipments sent`
        : order.usesPairedPreparation ? ({ request: 'Kits not requested', receive: progress.receiveStatus === 'Request received' ? 'Kit request received' : progress.receiveStatus === 'Sent' ? 'Kits sent' : progress.receiveStatus === 'Partially sent' ? 'Kits partially sent' : progress.receiveStatus === 'Partially received' ? 'Kits partially received' : 'Awaiting kits', prepare: 'Preparing samples', send: 'Preparing shipment' }[progress.next ?? 'send'])
        : phase.containerCount > 0 ? 'Preparing shipment' : 'Not sent'
      const open = single || tracking.expandedPhaseId === phase.id
      const inactive = ['Cancelled', 'Superseded'].includes(phase.lifecycle)
      const phaseActions = labJobPhaseActions(phase, canCancel, tracking.onResults, onCancel)
      const date = (value: string | null) => value ? formatDisplayTimestamp(value, { seconds: true }) : 'Not established'
      return <section key={phase.id} id={single ? `phase-summary-${phase.id}` : undefined} tabIndex={single ? -1 : undefined} aria-label={single ? "Order progress" : phase.name} className="py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {single && phase.cancellationPending ? <p className="mb-3 text-sm text-muted-foreground"><CustomerText message="m_c07f337c6361" /></p> : null}
        <div className={single ? "grid grid-cols-2 gap-4 py-3 md:grid-cols-5" : cn(rowGrid, 'grid-cols-2 items-start px-3 py-3')}>
          {!single ? <button id={`phase-summary-${phase.id}`} type="button" aria-expanded={open} aria-controls={`phase-detail-${phase.id}`} disabled={tracking.disabled}
            onClick={() => tracking.onExpand(open ? undefined : phase.id)}
            className="col-span-2 flex min-h-6 cursor-pointer items-start gap-2 rounded-sm text-left font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 md:col-span-1">
            <ChevronRight aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0 transition-transform motion-reduce:transition-none', open && 'rotate-90')} />
            <span className="wrap-anywhere">{phase.position}. {phase.name}{phase.cancellationPending ? <span className="block text-xs text-muted-foreground"><CustomerText message="m_c07f337c6361" /></span> : null}</span>
          </button> : null}
          <PhaseCell label={__customerText('m_bc228b269ce0')} showLabel={single}>{phase.sampleCount}</PhaseCell>
          <PhaseCell label={__customerText('m_ad5751430e29')} showLabel={single}>{shippingStatus}</PhaseCell>
          <PhaseCell label={__customerText('m_1ab69c6aae71')} showLabel={single}>{phase.expectedTubes > 0 ? __customerText('m_ddf3fbdd0048', { p0: String(phase.receivedTubes), p1: String(phase.expectedTubes) }) : inactive ? "No tubes expected" : __customerText('m_14ca9383bc77')}</PhaseCell>
          <PhaseCell label={__customerText('m_5e37d1bb9d04')} showLabel={single}>{phaseProgress(phase.stageCounts, false) || humanizeStatus(phase.lifecycle)}{phase.heldSamples || phase.failedSamples ? <span className="block text-xs text-muted-foreground">{phase.heldSamples} <CustomerText message="m_97c2c47609fc" />{phase.failedSamples} <CustomerText message="m_7d0540231216" /></span> : null}</PhaseCell>
          <PhaseCell label={__customerText('m_219c4a6c86a7')} showLabel={single}>{phase.deliveredSamples} of {phase.sampleCount}</PhaseCell>
        </div>
        {open ? <div id={`phase-detail-${phase.id}`} role="region" aria-label={single ? "Samples and shipment progress" : undefined} aria-labelledby={single ? undefined : `phase-summary-${phase.id}`} className={cn('space-y-4 border-t py-4', !single && 'bg-muted/20 px-3')}>
          <LabPhaseSampleProgress phase={phase} single={single} />
          <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-4">
            <dl className="grid flex-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="font-bold text-muted-foreground"><CustomerText message="m_7b172cf1ca32" /></dt><dd>{phase.turnaroundBusinessDays ? __customerText('m_e93634b46528', { p0: String(phase.turnaroundBusinessDays), p1: String(single ? 'after all required samples are received' : 'from complete receipt') }) : __customerText('m_3689cc3b6776')}</dd></div>
              <div><dt className="font-bold text-muted-foreground"><CustomerText message="m_1392560da73b" /></dt><dd>{date(phase.completeReceiptAtUtc)}</dd></div>
              <div><dt className="font-bold text-muted-foreground"><CustomerText message="m_0a4fbf152ddf" /></dt><dd>{date(phase.dueAtUtc)}{phase.originalDueAtUtc && phase.dueAtUtc !== phase.originalDueAtUtc ? __customerText('m_df40c4a40d34', { p0: String(date(phase.originalDueAtUtc)) }) : null}{phase.calendarPending ? <CustomerSourceText source={" · Calendar coverage needs review"} /> : ''}</dd></div>
              <div><dt className="font-bold text-muted-foreground"><CustomerText message="m_b8dc97fdc4f9" /></dt><dd>{phase.containerCount > 0 ? `${phase.arrivedContainers} of ${phase.containerCount}` : inactive ? "No containers expected" : __customerText('m_14ca9383bc77')}</dd></div>
              {phase.scope ? <div><dt className="text-muted-foreground"><CustomerText message="m_1eb1f1e140ea" /></dt><dd>{phase.scope.sequencingRunCount} <CustomerText message="m_88c4fa961179" />{phase.scope.runsPerSample ? __customerText('m_5f1f2eae4322', { p0: String(phase.scope.runsPerSample) }) : ''}</dd></div> : null}
            </dl>
            {!single || !singlePhaseActionsInHeader ? <LabJobPhaseActions actions={phaseActions} disabled={tracking.disabled} /> : null}
          </div>
          {phase.scope ? <p className="text-sm text-muted-foreground">{phase.scope.sources.map((source, index) => <span key={source.biologicalSource}>{index > 0 ? ' · ' : null}<span className="font-bold">{source.biologicalSource}:</span> {labSampleCount(source.specimenCount)}</span>)}</p> : null}
          <div><h4 className="font-semibold"><CustomerText message="m_bc228b269ce0" /></h4>{sampleIds.length ? <ul className="mt-2 divide-y">{sampleIds.map(id => {
            const sample = phaseSamples.find(s => s.id === id)
            const member = members.find(s => s.id === id)
            return <li key={id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="wrap-anywhere">{sample?.name ?? member?.customerSampleId ?? 'Sample ID pending'}</span><span>{sample ? customerStage(sample.stage, false) : member ? humanizeStatus(member.status) : __customerText('m_cb9c7523f103')}{sample?.held ? <CustomerSourceText source={" · Held"} /> : ''}{sample?.failed ? <CustomerSourceText source={" · Needs review"} /> : ''}</span></li>
          })}</ul> : <p className="mt-1 text-sm text-muted-foreground">{single ? <CustomerSourceText source={"Sample IDs will appear after preparation."} /> : __customerText('m_01761ba36e29')}</p>}</div>
          <PhaseShipments shipments={shipments} ready={tracking.shippingReady} single={single} />
          {customerSpecimenHoldsEnabled ? <SpecimenHolds orderId={order.id} sampleIds={sampleIds} embedded onModalChange={tracking.onHoldModalChange} /> : null}
        </div> : null}
      </section>
    })}</div>
    {tracking.shippingReady && tracking.shipments.some(s => !s.isPackingPool && !knownShipmentIds.has(s.id)) ? <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_34c488d3a08a" /></summary><div className="mt-2"><PhaseShipments shipments={tracking.shipments.filter(s => !s.isPackingPool && !knownShipmentIds.has(s.id))} ready /></div></details> : null}
  </div>
}

function PhaseCell({ label, children, showLabel = false }: { label: string; children: ReactNode; showLabel?: boolean }) {
  return <dl className="min-w-0 text-sm wrap-anywhere"><dt className={cn('mb-1 block text-xs font-bold text-muted-foreground', !showLabel && 'md:sr-only')}>{label}</dt><dd>{children}</dd></dl>
}
function PhaseShipments({ shipments, ready, single = false }: { shipments: SampleShipmentWorkflow[]; ready: boolean; single?: boolean }) {
  const __customerText = useCustomerText()

  return <div><h4 className="font-semibold"><CustomerText message="m_f41deb2033e4" /></h4>{!ready ? <p role="status" className="mt-1 text-sm text-muted-foreground"><CustomerText message="m_8006d374531d" /></p> : shipments.length ? <ul className="mt-2 divide-y">{shipments.map(shipment => <li key={shipment.id} className="space-y-1 py-2 text-sm">
    <div className="flex flex-wrap justify-between gap-2"><span className="wrap-anywhere"><RecordLink asChild><Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }} >{shipment.shipmentNumber}</Link></RecordLink></span><span>{humanizeStatus(shipment.status)}</span></div>
    <p className="text-muted-foreground wrap-anywhere">{shipment.carrier || 'Carrier not recorded'}{shipment.trackingNumber ? __customerText('m_a202b2edcefc', { p0: String(shipment.trackingNumber) }) : ''} · {shipment.destinationName}</p>
    <p className="text-muted-foreground">{shipment.shippedAt ? __customerText('m_75c2977ea865', { p0: String(formatDisplayTimestamp(shipment.shippedAt, { seconds: true })) }) : __customerText('m_43f09128ac06')}{shipment.receivedTubeCount !== undefined && shipment.expectedTubeCount !== undefined ? __customerText('m_0b2ff1cd5bc8', { p0: String(shipment.receivedTubeCount), p1: String(shipment.expectedTubeCount) }) : ''}</p>
  </li>)}</ul> : <EmptyState  kind="empty" title={<>{single ? <CustomerSourceText source={"No sample shipments recorded yet."} /> : __customerText('m_805798fb03e6')}</>} />}</div>
}
