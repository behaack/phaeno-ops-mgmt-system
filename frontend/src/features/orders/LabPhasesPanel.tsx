import { useEffect, useState } from 'react'
import type { LabServiceOrder } from '#/api/order-management'
import { getOrderErrorMessage } from '#/api/order-management'
import type { LabPhasePlan, PhasePlanItem } from '#/api/lab-phases'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus } from './OrderStatusBadge'
import { useLabPhasePlan } from './use-lab-phases'
import { PhasePlanDialog, PhaseReasonDialog, PhaseInvoiceDialog, type PhaseReasonAction } from './LabPhaseDialogs'
import { LabJobPhaseList, type LabJobPhaseTracking } from './LabJobPhaseList'
import { hasMultipleLabPhases } from './lab-job-presentation'
import { phaseProgress } from './lab-phase-progress'
export { customerStage, phaseProgress } from './lab-phase-progress'

export function LabPhasesPanel({ order, internal = false, onSaved, tracking, onModalChange }: { order: LabServiceOrder; internal?: boolean; onSaved: () => Promise<unknown>; tracking?: LabJobPhaseTracking; onModalChange?: (open: boolean) => void }) {
  const { session } = usePhaenoSession()
  const query = useLabPhasePlan(order.id, internal)
  const [editor, setEditor] = useState<LabPhasePlan | null>(null)
  const [invoice, setInvoice] = useState<LabPhasePlan | null>(null)
  const [reason, setReason] = useState<PhaseReasonAction | null>(null)
  const modalOpen = Boolean(editor || invoice || reason)
  useEffect(() => { onModalChange?.(modalOpen); return () => onModalChange?.(false) }, [modalOpen, onModalChange])
  const canManage = internal ? session?.capabilities.canOperateCommercialWork : order.canManageQuotes
  const accepted = order.quotes.some(q => q.status === 'Accepted')
  const closed = ['Completed', 'Cancelled', 'Declined'].includes(order.status)
  const configurable = !order.phaseScopes?.length && !accepted && ['DraftRequest', 'SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation'].includes(order.status)
  const plan = query.data
  const multiplePhases = hasMultipleLabPhases(order, plan)
  const pending = plan?.proposals.some(p => p.status === 'Pending')
  const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: plan?.currency ?? 'USD' }).format(value)
  const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not established'
  const actions = plan ? [
    ...(internal && canManage && !closed && (configurable || accepted && !pending) ? [{ label: accepted ? 'Propose rephasing' : 'Configure phases', run: () => setEditor(plan) }] : []),
    ...(internal && session?.capabilities.canManagePSeqBilling && accepted && plan.phases.some(p => p.lifecycle !== 'Cancelled' && p.acceptedSubtotal > p.invoicedSubtotal) ? [{ label: 'Issue phase invoice', run: () => setInvoice(plan) }] : []),
  ] : []
  if (order.phaseScopes?.length === 1 && !accepted) return <Card><CardHeader><CardTitle>Samples and pricing</CardTitle></CardHeader><CardContent><p>{order.phaseScopes[0].sampleCount} samples · {order.phaseScopes[0].scope.runsPerSample} runs per sample · {order.phaseScopes[0].scope.sequencingRunCount} purchased runs</p><p className="mt-2 text-sm"><span className="font-bold">Proposed rate:</span> {order.phaseScopes[0].proposedUnitPrice === null ? 'No price proposed' : `${money(order.phaseScopes[0].proposedUnitPrice)} per sample`}</p>{order.phaseScopes[0].scope.sequencingRunCount > order.phaseScopes[0].sampleCount ? <p className="mt-1 text-sm"><span className="font-bold">Additional-run rate:</span> {order.phaseScopes[0].proposedAdditionalRunPrice == null ? 'No price proposed' : `${money(order.phaseScopes[0].proposedAdditionalRunPrice)} per additional run`}</p> : null}{order.phaseScopes[0].pricingNote ? <p className="mt-2 text-sm">{order.phaseScopes[0].pricingNote}</p> : null}</CardContent></Card>
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><CardTitle>{tracking ? 'Progress' : multiplePhases ? 'Phases' : 'Delivery scope'}</CardTitle><CardDescription>{tracking ? multiplePhases ? 'Expand a phase for its samples, shipments, timing and holds.' : 'Review your samples, shipments, timing and holds.' : 'Ship each phase in order. The next phase can be requested after all required shipments are sent. Laboratory processing remains in phase order; each phase’s TAT starts when every required sample is received.'}</CardDescription></div>
      {actions.length === 1 ? <Button variant="outline" onClick={actions[0].run}>{actions[0].label}</Button> : actions.length > 1 ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent>{actions.map(action => <DropdownMenuItem key={action.label} onSelect={action.run}>{action.label}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}
    </CardHeader>
    <CardContent className="space-y-4" aria-busy={query.isFetching}>
      {query.isLoading ? <p role="status">{tracking ? 'Loading progress…' : 'Loading phases…'}</p> : null}
      {query.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(query.error, tracking ? 'Progress could not be loaded.' : 'Phases could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {plan && !tracking ? <p className="text-sm text-muted-foreground">{plan.sampleCount} samples · Plan revision {plan.revision}{accepted ? ` · ${money(plan.acceptedSubtotal)} accepted subtotal` : ''}</p> : null}
      {plan && tracking ? <LabJobPhaseList order={order} plan={plan} tracking={tracking} canCancel={Boolean(!internal && canManage && accepted && !closed)} onCancel={phase => setReason({ title: multiplePhases ? `Request cancellation of ${phase.name}` : 'Request cancellation of sample work', description: 'Phaeno reviews this request. Eligibility closes when the first required tube is physically received. Any billing adjustment is reviewed separately.', path: `${phase.id}/cancellation`, input: { revision: plan.revision }, internal: false })} /> : plan?.phases.map(phase => <article key={phase.id} className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{(order.phaseCount ?? 1) > 1 ? `${phase.position}. ${phase.name}` : 'Order delivery'}</h3><p className="text-sm">{phase.sampleCount} samples · {humanizeStatus(phase.lifecycle)}{phase.cancellationPending ? ' · Cancellation requested' : ''}</p></div>
          {!internal && canManage && accepted && !closed && phase.cancellationEligible && !phase.cancellationPending ? <Button variant="outline" onClick={() => setReason({ title: multiplePhases ? `Request cancellation of ${phase.name}` : 'Request cancellation of sample work', description: 'Phaeno reviews this request. Eligibility closes when the first required tube is physically received. Any billing adjustment is reviewed separately.', path: `${phase.id}/cancellation`, input: { revision: plan.revision }, internal: false })}>Request cancellation</Button> : null}
        </div>
        {phase.scope ? <div className="text-sm"><p>{phase.scope.sequencingRunCount} purchased runs{phase.scope.runsPerSample ? ` · ${phase.scope.runsPerSample} per sample` : ''}</p><ul className="mt-1 text-muted-foreground">{phase.scope.sources.map(source => <li key={source.biologicalSource}>{source.biologicalSource} · {source.specimenCount} samples</li>)}</ul>{!accepted ? <p className="mt-2"><span className="font-bold">Proposed rate:</span> {phase.proposedUnitPrice == null ? 'No price proposed' : `${money(phase.proposedUnitPrice)} per sample`}</p> : null}{!accepted && phase.scope.sequencingRunCount > phase.sampleCount ? <p><span className="font-bold">Additional-run rate:</span> {phase.proposedAdditionalRunPrice == null ? 'No price proposed' : `${money(phase.proposedAdditionalRunPrice)} per additional run`}</p> : null}</div> : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="font-bold">Current progress</dt><dd>{phase.mixedProgress ? 'Mixed · ' : ''}{phaseProgress(phase.stageCounts, internal)}</dd></div>
          <div><dt className="font-bold">Physical receipt</dt><dd>{phase.receivedTubes} of {phase.expectedTubes} tubes · {phase.arrivedContainers} of {phase.containerCount} containers arrived</dd></div>
          <div><dt className="font-bold">Portal delivery</dt><dd>{phase.deliveredSamples} of {phase.sampleCount} samples</dd></div>
          <div><dt className="font-bold">TAT expectation</dt><dd>{phase.turnaroundBusinessDays ? `${phase.turnaroundBusinessDays} business days` : 'Set before quote issuance'}</dd></div>
          <div><dt className="font-bold">Complete receipt</dt><dd>{date(phase.completeReceiptAtUtc)}</dd></div>
          <div><dt className="font-bold">Delivery due</dt><dd>{date(phase.dueAtUtc)}{phase.originalDueAtUtc && phase.dueAtUtc !== phase.originalDueAtUtc ? ` · Original ${date(phase.originalDueAtUtc)}` : null}{phase.calendarPending ? ' · Calendar coverage needs review' : ''}</dd></div>
          <div><dt className="font-bold">Phase price</dt><dd>{money(phase.acceptedSubtotal)}{internal || session?.capabilities.canViewLabServiceInvoices ? ` · ${money(phase.invoicedSubtotal)} invoiced` : ''}</dd></div>
        </dl>
        {phase.heldSamples || phase.failedSamples ? <p className="text-sm">{phase.heldSamples} held · {phase.failedSamples} need review. These counts overlap progress stages.</p> : null}
      </article>)}
      {plan?.proposals.map(proposal => <article key={proposal.id} className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold">Rephasing proposal · {proposal.status}</h3>
          {!internal && canManage && !closed && proposal.status === 'Pending' ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent>
            {[true, false].map(accept => <DropdownMenuItem key={String(accept)} onSelect={() => setReason({ title: accept ? 'Accept rephasing' : 'Decline rephasing', description: 'Review the exact cohorts, TAT expectations and billing portions below. Sending a sample fixes its phase assignment; acceptance rechecks current facts.', path: `proposals/${proposal.id}/decision`, input: { version: proposal.version, accept }, review: proposalReviewText(proposal.beforeJson, proposal.afterJson, money), internal: false })}>{accept ? 'Accept rephasing' : 'Decline rephasing'}</DropdownMenuItem>)}
          </DropdownMenuContent></ActionMenu> : null}
        </div><p className="text-sm">{proposal.reason}</p><PhaseProposalReview afterJson={proposal.afterJson} beforeJson={proposal.beforeJson} money={money} />
        {proposal.decisionReason ? <p className="text-sm">Decision: {proposal.decisionReason}</p> : null}
      </article>)}
      {plan?.cancellations.map(request => <article key={request.id} className="space-y-2 rounded-md border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold">Cancellation{multiplePhases ? ` · ${plan.phases.find(p => p.id === request.phaseId)?.name}` : ''} · {request.status}</h3>
        {internal && canManage && !closed && request.status === 'Pending' ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent>{[true, false].map(accept => <DropdownMenuItem key={String(accept)} onSelect={() => setReason({ title: accept ? 'Approve phase cancellation' : 'Decline phase cancellation', description: 'Approval rechecks first tube receipt and all work evidence. It retains commercial scope and invoices; Finance reviews any adjustment separately.', path: `cancellations/${request.id}/decision`, input: { version: request.version, accept }, internal: true })}>{accept ? 'Approve cancellation' : 'Decline cancellation'}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div><p className="text-sm">{request.reason}</p>{request.decisionReason ? <p className="text-sm">Decision: {request.decisionReason}</p> : null}</article>)}
    </CardContent>
    {editor ? <PhasePlanDialog orderId={order.id} plan={editor} amendment={accepted} onSaved={onSaved} onClose={() => setEditor(null)} /> : null}
    {invoice ? <PhaseInvoiceDialog orderId={order.id} plan={invoice} onSaved={onSaved} onClose={() => setInvoice(null)} /> : null}
    {reason ? <PhaseReasonDialog orderId={order.id} action={reason} onSaved={onSaved} onClose={() => setReason(null)} /> : null}
  </Card>
}

function PhaseProposalReview({ afterJson, beforeJson, money }: { afterJson: string; beforeJson: string; money: (value: number) => string }) {
  const after = JSON.parse(afterJson) as PhasePlanItem[]
  const before = JSON.parse(beforeJson) as LabPhasePlan
  return <details className="text-sm" open><summary className="cursor-pointer font-medium">Review proposed plan and sample moves</summary>
    <div className="mt-2 space-y-2">{after.map((phase, i) => <p key={phase.id ?? i}>{i + 1}. {phase.name} · {phase.sampleCount} samples · {phase.turnaroundBusinessDays} business days · {money(phase.acceptedSubtotal)}{phase.carriedInvoicedSubtotal ? ` · ${money(phase.carriedInvoicedSubtotal)} previous invoicing carried` : ''}</p>)}
      <ul className="list-disc space-y-1 pl-5">{before.samples.filter(s => after.find(p => p.sampleIds.includes(s.id))?.id !== s.phaseId).map(s => <li key={s.id}>{s.name}: {before.phases.find(p => p.id === s.phaseId)?.name} → {after.find(p => p.sampleIds.includes(s.id))?.name}</li>)}</ul>
      <p className="text-muted-foreground">Previous accepted plan: {before.phases.map(p => `${p.name}: ${p.sampleCount} samples, ${p.turnaroundBusinessDays} business days, ${money(p.acceptedSubtotal)}`).join(' · ')}. Original receipt dates, commitments and issued invoices remain recorded.</p>
    </div>
  </details>
}

function proposalReviewText(beforeJson: string, afterJson: string, money: (value: number) => string) {
  const before = JSON.parse(beforeJson) as LabPhasePlan
  const after = JSON.parse(afterJson) as PhasePlanItem[]
  const phaseText = (p: { name: string; sampleCount: number; turnaroundBusinessDays: number | null; acceptedSubtotal: number; carriedInvoicedSubtotal: number }) => `${p.name}: ${p.sampleCount} samples, ${p.turnaroundBusinessDays} business days, ${money(p.acceptedSubtotal)} accepted, ${money(p.carriedInvoicedSubtotal)} previously invoiced carried`
  return [
    'Previous plan:', ...before.phases.map(p => phaseText(p)),
    'Proposed plan:', ...after.map(phaseText),
    'Sample moves:', ...before.samples.filter(s => after.find(p => p.sampleIds.includes(s.id))?.id !== s.phaseId).map(s => `${s.name}: ${before.phases.find(p => p.id === s.phaseId)?.name} → ${after.find(p => p.sampleIds.includes(s.id))?.name}`),
  ].join('\n')
}
