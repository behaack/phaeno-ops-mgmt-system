import type { ReactNode } from 'react'
import type { LabServiceOrder, Quote } from '#/api/order-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { LabOrderScope } from './LabOrderScope'
import { QuoteTurnaround } from './QuoteTurnaround'
import { formatQuoteMoney, QuoteHeader, QuoteLines, QuoteSummary, QuoteTotals } from './QuoteSummary'
import { readPhaseRunBreakdown, readQuotePhaseReview, type QuoteReviewPhase } from './quote-phase-review'

const quoteDescription = 'Proposed pricing is not a quote. Issued and accepted quotes remain unchanged; corrections appear as documented revisions or adjustments.'

export function LabOrderQuoteReview({ order, quote, status, quoteHelp, billing }: {
  order: LabServiceOrder; quote: Quote | null; status?: string; quoteHelp?: ReactNode; billing?: ReactNode
}) {
  const phases = quote && !order.standardCommercialSnapshot ? readQuotePhaseReview(quote) : []
  if (quote && phases.length > 1) return <div className="mt-4 min-w-0 space-y-4">
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-x-8">
      <section className="min-w-0 space-y-3" aria-label="Order scope"><h3 className="font-semibold">Order scope</h3><LabOrderScope order={order} quote={quote} showSourceGroups={false} showTotals={false} /><p className="text-sm font-semibold">{phases.reduce((total, phase) => total + phase.sampleCount, 0)} samples · {phases.length} phases in this quote</p></section>
      <section className="min-w-0 space-y-3" aria-label="Quote and billing"><h3 className="font-semibold">Quote and billing</h3><p className="text-sm text-muted-foreground">{quoteDescription}</p><ProposedPrice order={order} /><QuoteHeader quote={quote} status={status} /></section>
    </div>
    {phases.map(phase => <PhaseReview key={phase.id} phase={phase} quote={quote} />)}
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-x-8">
      <p className="text-sm text-muted-foreground">Each phase's TAT starts when Phaeno physically receives every required sample for that phase. Business days exclude Phaeno holidays.</p>
      <section className="min-w-0" aria-label="Order totals and billing"><QuoteTotals quote={quote} />{quoteHelp}{billing}</section>
    </div>
  </div>
  return <div className="mt-4 grid min-w-0 items-start gap-5 lg:grid-cols-2">
    <Card><CardHeader><CardTitle>Order scope</CardTitle></CardHeader><CardContent><LabOrderScope order={order} quote={quote} /></CardContent></Card>
    <Card><CardHeader><CardTitle>{order.standardCommercialSnapshot ? 'Billing' : 'Quote and billing'}</CardTitle><CardDescription>{order.standardCommercialSnapshot ? 'The accepted standard bundle is recorded above. Issued invoices and audited adjustments remain with this Job.' : quoteDescription}</CardDescription></CardHeader><CardContent>
      <ProposedPrice order={order} />
      {order.standardCommercialSnapshot ? <p className="text-sm text-muted-foreground">Standard bundle accepted. No separate assembly quote is required.</p>
        : quote ? <><QuoteSummary quote={quote} status={status} /><QuoteTurnaround quote={quote} />{quoteHelp}</> : <p className="text-sm text-muted-foreground">Phaeno has not issued pricing yet.</p>}
      {billing}
    </CardContent></Card>
  </div>
}

function PhaseReview({ phase, quote }: { phase: QuoteReviewPhase; quote: Quote }) {
  const breakdown = readPhaseRunBreakdown(phase)
  return <section aria-label={`${phase.position}. ${phase.name}`} className="min-w-0 rounded-md border p-3 sm:p-4">
    <h3 className="font-bold">{phase.position}. {phase.name}</h3>
    <div className="mt-3 grid min-w-0 items-start gap-4 lg:grid-cols-2 lg:gap-x-8">
      <div className="min-w-0 space-y-2"><PhaseDetails phase={phase} breakdown={breakdown} /></div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold">Pricing</h4>
        {breakdown && breakdown.additionalRuns > 0 ? <p className="mt-1 text-sm text-muted-foreground">{breakdown.additionalRunsPerSample !== null
          ? `${phase.sampleCount} samples × ${breakdown.additionalRunsPerSample} additional ${breakdown.additionalRunsPerSample === 1 ? 'run' : 'runs'} per sample = ${breakdown.additionalRuns} additional runs.`
          : `${phase.scope!.sequencingRunCount} total runs − ${breakdown.includedRuns} included runs = ${breakdown.additionalRuns} additional runs.`}</p> : null}
        <QuoteLines lines={phase.lines} currency={quote.currency} catalogItemNames={quote.catalogItemNames} compact />
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t pt-2 text-sm"><strong>Phase price:</strong><span className="whitespace-nowrap font-semibold tabular-nums">{formatQuoteMoney(phase.acceptedSubtotal, quote.currency)}</span></p>
      </div>
    </div>
  </section>
}

function PhaseDetails({ phase, breakdown }: { phase: QuoteReviewPhase; breakdown: ReturnType<typeof readPhaseRunBreakdown> }) {
  return <>
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      <div><dt className="inline font-bold">Samples:</dt>{' '}<dd className="inline tabular-nums">{phase.sampleCount}</dd></div>
      <div><dt className="inline font-bold">TAT:</dt>{' '}<dd className="inline">{phase.turnaroundBusinessDays} business days</dd></div>
      {phase.scope ? <><div className="sm:col-span-2"><dt className="inline font-bold">Sequencing runs:</dt>{' '}<dd className="inline tabular-nums">{phase.scope.sequencingRunCount}</dd></div>
        {phase.scope.runsPerSample !== null ? <div className="sm:col-span-2"><dt className="inline font-bold">Runs per sample:</dt>{' '}<dd className="inline tabular-nums">{phase.scope.runsPerSample}{breakdown ? breakdown.additionalRunsPerSample === 0 ? ' total (1 included)' : ` total (1 included + ${breakdown.additionalRunsPerSample} additional)` : null}</dd></div> : null}</> : null}
    </dl>
    {phase.scope?.sources.length ? <table className="w-full text-left text-sm">
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-1 font-bold">Biological source</th><th scope="col" className="pb-1 text-right font-bold">Samples</th></tr></thead>
      <tbody>{phase.scope.sources.map((source, index) => <tr key={index} className="border-b last:border-0"><th scope="row" className="py-1 pr-4 font-normal wrap-anywhere">{source.biologicalSource}</th><td className="py-1 text-right tabular-nums">{source.specimenCount}</td></tr>)}</tbody>
    </table> : null}
  </>
}

function ProposedPrice({ order }: { order: LabServiceOrder }) {
  if (order.proposedUnitPrice == null) return null
  const currency = order.proposedCurrency ?? 'USD'
  return <div className="mb-4 border-b pb-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your proposed price</p><p className="mt-1 font-semibold">{formatQuoteMoney(order.proposedUnitPrice, currency)} per sample</p><p className="mt-1 text-sm text-muted-foreground">Proposed standard-service subtotal {formatQuoteMoney(order.proposedUnitPrice * order.requestedSpecimenCount, currency)} for {order.requestedSpecimenCount} samples, including one library preparation, one run and data assembly per sample. Additional runs are quoted separately. Phaeno may approve or amend this before issuing the quote.</p>{order.priceProposalNote ? <p className="mt-2 text-sm">{order.priceProposalNote}</p> : null}</div>
}
