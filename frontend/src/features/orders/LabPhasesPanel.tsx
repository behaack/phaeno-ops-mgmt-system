import { formatDisplayTimestamp } from '#/lib/display-format'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useEffect, useState } from 'react'
import type { LabServiceOrder } from '#/api/order-management'
import { getOrderErrorMessage } from '#/api/order-management'
import type { LabPhase, LabPhasePlan, PhasePlanItem } from '#/api/lab-phases'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DialogReturnFocus } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { usePhaenoSession } from '#/features/auth/session-context'
import { humanizeStatus } from './OrderStatusBadge'
import { useLabPhasePlan } from './use-lab-phases'
import { PhasePlanDialog, PhaseReasonDialog, PhaseInvoiceDialog, type PhaseReasonAction } from './LabPhaseDialogs'
import { LabJobPhaseList, type LabJobPhaseTracking } from './LabJobPhaseList'
import { LabJobPhaseActions, labJobPhaseActions } from './LabJobPhaseActions'
import { hasMultipleLabPhases } from './lab-job-presentation'
import { phaseProgress } from './lab-phase-progress'
export { customerStage, phaseProgress } from './lab-phase-progress'

export function LabPhasesPanel({ order, internal = false, onSaved, tracking, onModalChange }: { order: LabServiceOrder; internal?: boolean; onSaved: () => Promise<unknown>; tracking?: LabJobPhaseTracking; onModalChange?: (open: boolean) => void }) {
  const __customerText = useCustomerText()

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
  const date = (value: string | null) => value ? formatDisplayTimestamp(value, { seconds: true }) : 'Not established'
  const canCancel = Boolean(!internal && canManage && accepted && !closed)
  const onCancel = (phase: LabPhase) => {
    if (!plan) return
    setReason({ title: multiplePhases ? `Request cancellation of ${phase.name}` : 'Request cancellation of sample work', description: __customerText('m_87bf72d61af4'), path: `${phase.id}/cancellation`, input: { revision: plan.revision }, internal: false, variant: 'destructive' })
  }
  const singleTrackingPhase = tracking && plan && !multiplePhases && plan.phases.length === 1 ? plan.phases[0] : undefined
  const actions = plan ? [
    ...(internal && canManage && !closed && (configurable || accepted && !pending) ? [{ label: accepted ? 'Propose rephasing' : 'Configure phases', run: () => setEditor(plan) }] : []),
    ...(internal && session?.capabilities.canManagePSeqBilling && accepted && plan.phases.some(p => p.lifecycle !== 'Cancelled' && p.acceptedSubtotal > p.invoicedSubtotal) ? [{ label: __customerText('m_0f6556faf53c'), run: () => setInvoice(plan) }] : []),
    ...(singleTrackingPhase && tracking ? labJobPhaseActions(singleTrackingPhase, canCancel, tracking.onResults, onCancel) : []),
  ] : []
  if (order.phaseScopes?.length === 1 && !accepted) return <Card><CardHeader><CardTitle><CustomerText message="m_0cc51cec169e" /></CardTitle></CardHeader><CardContent><p>{order.phaseScopes[0].sampleCount} <CustomerText message="m_a0d8d107681a" />{order.phaseScopes[0].scope.runsPerSample} <CustomerText message="m_e678567af68d" />{order.phaseScopes[0].scope.sequencingRunCount} <CustomerText message="m_514d636e8442" /></p><p className="mt-2 text-sm"><span className="font-bold"><CustomerText message="m_b67ba98bc3d4" /></span> {order.phaseScopes[0].proposedUnitPrice === null ? <CustomerSourceText source={"No price proposed"} /> : __customerText('m_5d62d567283a', { p0: String(money(order.phaseScopes[0].proposedUnitPrice)) })}</p>{order.phaseScopes[0].scope.sequencingRunCount > order.phaseScopes[0].sampleCount ? <p className="mt-1 text-sm"><span className="font-bold"><CustomerText message="m_e843d7b8b550" /></span> {order.phaseScopes[0].proposedAdditionalRunPrice == null ? <CustomerSourceText source={"No price proposed"} /> : __customerText('m_5148001c0a82', { p0: String(money(order.phaseScopes[0].proposedAdditionalRunPrice)) })}</p> : null}{order.phaseScopes[0].pricingNote ? <p className="mt-2 text-sm">{order.phaseScopes[0].pricingNote}</p> : null}</CardContent></Card>
  return <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><CardTitle>{tracking ? <CustomerSourceText source={"Progress"} /> : multiplePhases ? "Phases" : __customerText('m_fa15b0c00c37')}</CardTitle><CardDescription>{tracking ? multiplePhases ? "Expand a phase for its samples, shipments and timing." : "Review your samples, shipments and timing." : __customerText('m_9757c2dbbb1d')}</CardDescription></div>
      <LabJobPhaseActions id={`phase-progress-actions-${order.id}`} actions={actions} disabled={tracking?.disabled} compact={Boolean(tracking)} />
    </CardHeader>
    <CardContent className="space-y-4" aria-busy={query.isFetching}>
      {query.isLoading ? <p role="status">{tracking ? <CustomerSourceText source={"Loading progress…"} /> : __customerText('m_499ad32add53')}</p> : null}
      {query.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, tracking ? 'Progress could not be loaded.' : 'Phases could not be loaded.')} />} <Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      {plan && !tracking ? <p className="text-sm text-muted-foreground">{plan.sampleCount} <CustomerText message="m_860a488904af" />{plan.revision}{accepted ? __customerText('m_1bd47dff95fc', { p0: String(money(plan.acceptedSubtotal)) }) : ''}</p> : null}
      {plan && tracking ? <LabJobPhaseList order={order} plan={plan} tracking={tracking} canCancel={canCancel} onCancel={onCancel} singlePhaseActionsInHeader={Boolean(singleTrackingPhase)} /> : plan?.phases.map(phase => <article key={phase.id} className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{(order.phaseCount ?? 1) > 1 ? `${phase.position}. ${phase.name}` : __customerText('m_d83ef9502861')}</h3><p className="text-sm">{phase.sampleCount} <CustomerText message="m_a0d8d107681a" />{humanizeStatus(phase.lifecycle)}{phase.cancellationPending ? <CustomerSourceText source={" · Cancellation requested"} /> : ''}</p></div>
          {!internal && canManage && accepted && !closed && phase.cancellationEligible && !phase.cancellationPending ? <ActionMenu keepSingleActionInMenu><DropdownMenuTrigger asChild><Button variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-44 max-w-[calc(100vw-2rem)]"><DropdownMenuItem variant="destructive" onSelect={() => setReason({ title: multiplePhases ? `Request cancellation of ${phase.name}` : 'Request cancellation of sample work', description: __customerText('m_87bf72d61af4'), path: `${phase.id}/cancellation`, input: { revision: plan.revision }, internal: false, variant: 'destructive' })}><CustomerText message="m_fbde6a9ae7a6" /></DropdownMenuItem></DropdownMenuContent></ActionMenu> : null}
        </div>
        {phase.scope ? <div className="text-sm"><p>{phase.scope.sequencingRunCount} <CustomerText message="m_514d636e8442" />{phase.scope.runsPerSample ? __customerText('m_5f1f2eae4322', { p0: String(phase.scope.runsPerSample) }) : ''}</p><ul className="mt-1 text-muted-foreground">{phase.scope.sources.map(source => <li key={source.biologicalSource}>{source.biologicalSource} · {source.specimenCount} <CustomerText message="m_686dd98cc6fc" /></li>)}</ul>{!accepted ? <p className="mt-2"><span className="font-bold"><CustomerText message="m_b67ba98bc3d4" /></span> {phase.proposedUnitPrice == null ? <CustomerSourceText source={"No price proposed"} /> : __customerText('m_5d62d567283a', { p0: String(money(phase.proposedUnitPrice)) })}</p> : null}{!accepted && phase.scope.sequencingRunCount > phase.sampleCount ? <p><span className="font-bold"><CustomerText message="m_e843d7b8b550" /></span> {phase.proposedAdditionalRunPrice == null ? <CustomerSourceText source={"No price proposed"} /> : __customerText('m_5148001c0a82', { p0: String(money(phase.proposedAdditionalRunPrice)) })}</p> : null}</div> : null}
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="font-bold"><CustomerText message="m_46814fcae9de" /></dt><dd>{phase.mixedProgress ? <CustomerSourceText source={"Mixed · "} /> : ''}{phaseProgress(phase.stageCounts, internal)}</dd></div>
          <div><dt className="font-bold"><CustomerText message="m_1ab69c6aae71" /></dt><dd>{phase.receivedTubes} of {phase.expectedTubes} <CustomerText message="m_2fb19d7bbf61" />{phase.arrivedContainers} of {phase.containerCount} <CustomerText message="m_77a57b41ead4" /></dd></div>
          <div><dt className="font-bold"><CustomerText message="m_78951a9f8e29" /></dt><dd>{phase.deliveredSamples} of {phase.sampleCount} <CustomerText message="m_686dd98cc6fc" /></dd></div>
          <div><dt className="font-bold"><CustomerText message="m_6253bd27f202" /></dt><dd>{phase.turnaroundBusinessDays ? __customerText('m_6e213271e6b7', { p0: String(phase.turnaroundBusinessDays) }) : __customerText('m_3689cc3b6776')}</dd></div>
          <div><dt className="font-bold"><CustomerText message="m_1392560da73b" /></dt><dd>{date(phase.completeReceiptAtUtc)}</dd></div>
          <div><dt className="font-bold"><CustomerText message="m_0a4fbf152ddf" /></dt><dd>{date(phase.dueAtUtc)}{phase.originalDueAtUtc && phase.dueAtUtc !== phase.originalDueAtUtc ? __customerText('m_df40c4a40d34', { p0: String(date(phase.originalDueAtUtc)) }) : null}{phase.calendarPending ? <CustomerSourceText source={" · Calendar coverage needs review"} /> : ''}</dd></div>
          <div><dt className="font-bold"><CustomerText message="m_67effa8c947f" /></dt><dd>{money(phase.acceptedSubtotal)}{internal || session?.capabilities.canViewLabServiceInvoices ? __customerText('m_006ca89622e9', { p0: String(money(phase.invoicedSubtotal)) }) : ''}</dd></div>
        </dl>
        {phase.heldSamples || phase.failedSamples ? <p className="text-sm">{phase.heldSamples} <CustomerText message="m_97c2c47609fc" />{phase.failedSamples} <CustomerText message="m_3aca8fd3fc66" /></p> : null}
      </article>)}
      {plan?.proposals.map(proposal => <article key={proposal.id} className="space-y-3 rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold"><CustomerText message="m_0958657fc3a8" />{proposal.status}</h3>
          {!internal && canManage && !closed && proposal.status === 'Pending' ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent>
            {[true, false].map(accept => <DropdownMenuItem key={String(accept)} onSelect={() => setReason({ title: accept ? 'Accept rephasing' : 'Decline rephasing', description: __customerText('m_7f570976fa82'), path: `proposals/${proposal.id}/decision`, input: { version: proposal.version, accept }, review: proposalReviewText(proposal.beforeJson, proposal.afterJson, money), internal: false })}>{accept ? <CustomerSourceText source={"Accept rephasing"} /> : __customerText('m_5cacd6415491')}</DropdownMenuItem>)}
          </DropdownMenuContent></ActionMenu> : null}
        </div><p className="text-sm">{proposal.reason}</p><PhaseProposalReview afterJson={proposal.afterJson} beforeJson={proposal.beforeJson} money={money} />
        {proposal.decisionReason ? <p className="text-sm"><CustomerText message="m_fb838a248177" />{proposal.decisionReason}</p> : null}
      </article>)}
      {plan?.cancellations.map(request => <article key={request.id} className="space-y-2 rounded-md border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold"><CustomerText message="m_53c8fc0bacc0" />{multiplePhases ? ` · ${plan.phases.find(p => p.id === request.phaseId)?.name}` : ''} · {request.status}</h3>
        {internal && canManage && !closed && request.status === 'Pending' ? <ActionMenu><DropdownMenuTrigger asChild><Button variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent>{[true, false].map(accept => <DropdownMenuItem key={String(accept)} onSelect={() => setReason({ title: accept ? 'Approve phase cancellation' : 'Decline phase cancellation', description: __customerText('m_2f569e66eefd'), path: `cancellations/${request.id}/decision`, input: { version: request.version, accept }, internal: true })}>{accept ? <CustomerSourceText source={"Approve cancellation"} /> : __customerText('m_cbd30eec05f2')}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu> : null}</div><p className="text-sm">{request.reason}</p>{request.decisionReason ? <p className="text-sm"><CustomerText message="m_fb838a248177" />{request.decisionReason}</p> : null}</article>)}
    </CardContent>
    {editor ? <PhasePlanDialog orderId={order.id} plan={editor} amendment={accepted} onSaved={onSaved} onClose={() => setEditor(null)} /> : null}
    {invoice ? <PhaseInvoiceDialog orderId={order.id} plan={invoice} onSaved={onSaved} onClose={() => setInvoice(null)} /> : null}
    {reason ? <DialogReturnFocus target={null} fallbackId={tracking && reason.path.endsWith('/cancellation') ? singleTrackingPhase ? `phase-progress-actions-${order.id}` : `phase-summary-${reason.path.split('/')[0]}` : undefined}><PhaseReasonDialog orderId={order.id} action={reason} onSaved={onSaved} onClose={() => setReason(null)} /></DialogReturnFocus> : null}
  </Card>
}

function PhaseProposalReview({ afterJson, beforeJson, money }: { afterJson: string; beforeJson: string; money: (value: number) => string }) {
  const __customerText = useCustomerText()

  const after = JSON.parse(afterJson) as PhasePlanItem[]
  const before = JSON.parse(beforeJson) as LabPhasePlan
  return <details className="text-sm" open><summary className="cursor-pointer font-medium"><CustomerText message="m_ec97f538a2fd" /></summary>
    <div className="mt-2 space-y-2">{after.map((phase, i) => <p key={phase.id ?? i}>{i + 1}. {phase.name} · {phase.sampleCount} <CustomerText message="m_a0d8d107681a" />{phase.turnaroundBusinessDays} <CustomerText message="m_8535a9ce1abc" />{money(phase.acceptedSubtotal)}{phase.carriedInvoicedSubtotal ? __customerText('m_c27c125b7af0', { p0: String(money(phase.carriedInvoicedSubtotal)) }) : ''}</p>)}
      <ul className="list-disc space-y-1 pl-5">{before.samples.filter(s => after.find(p => p.sampleIds.includes(s.id))?.id !== s.phaseId).map(s => <li key={s.id}>{s.name}: {before.phases.find(p => p.id === s.phaseId)?.name} → {after.find(p => p.sampleIds.includes(s.id))?.name}</li>)}</ul>
      <p className="text-muted-foreground"><CustomerText message="m_4ed78e47f3ab" />{before.phases.map(p => `${p.name}: ${p.sampleCount} samples, ${p.turnaroundBusinessDays} business days, ${money(p.acceptedSubtotal)}`).join(' · ')}<CustomerText message="m_18cb35777eff" /></p>
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
