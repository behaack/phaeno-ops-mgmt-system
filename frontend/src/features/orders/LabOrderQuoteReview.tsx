import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
  const __customerText = useCustomerText()

  const phases = quote && !order.standardCommercialSnapshot ? readQuotePhaseReview(quote) : []
  if (quote && phases.length > 1) return <div className="mt-4 min-w-0 space-y-4">
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-x-8">
      <section className="min-w-0 space-y-3" aria-label={__customerText('m_be63a2133d01')}><h3 className="font-semibold"><CustomerText message="m_be63a2133d01" /></h3><LabOrderScope order={order} quote={quote} showSourceGroups={false} showTotals={false} /><p className="text-sm font-semibold">{phases.reduce((total, phase) => total + phase.sampleCount, 0)} <CustomerText message="m_a0d8d107681a" />{phases.length} <CustomerText message="m_aace0e0e7b0b" /></p></section>
      <section className="min-w-0 space-y-3" aria-label={__customerText('m_bbdd2a7e0fe8')}><h3 className="font-semibold"><CustomerText message="m_bbdd2a7e0fe8" /></h3><p className="text-sm text-muted-foreground">{quoteDescription}</p><ProposedPrice order={order} /><QuoteHeader quote={quote} status={status} /></section>
    </div>
    {phases.map(phase => <PhaseReview key={phase.id} phase={phase} quote={quote} />)}
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-x-8">
      <p className="text-sm text-muted-foreground"><CustomerText message="m_4ad88fe0f7bc" /></p>
      <section className="min-w-0" aria-label={__customerText('m_340cfa2debac')}><QuoteTotals quote={quote} />{quoteHelp}{billing}</section>
    </div>
  </div>
  return <div className="mt-4 grid min-w-0 items-start gap-5 lg:grid-cols-2">
    <Card><CardHeader><CardTitle><CustomerText message="m_be63a2133d01" /></CardTitle></CardHeader><CardContent><LabOrderScope order={order} quote={quote} /></CardContent></Card>
    <Card><CardHeader><CardTitle>{order.standardCommercialSnapshot ? <CustomerSourceText source={"Billing"} /> : __customerText('m_bbdd2a7e0fe8')}</CardTitle><CardDescription>{order.standardCommercialSnapshot ? <CustomerSourceText source={"The accepted standard bundle is recorded above. Issued invoices and audited adjustments remain with this Job."} /> : quoteDescription}</CardDescription></CardHeader><CardContent>
      <ProposedPrice order={order} />
      {order.standardCommercialSnapshot ? <p className="text-sm text-muted-foreground"><CustomerText message="m_c8682710bc9d" /></p>
        : quote ? <><QuoteSummary quote={quote} status={status} /><QuoteTurnaround quote={quote} />{quoteHelp}</> : <p className="text-sm text-muted-foreground"><CustomerText message="m_99371d8288a4" /></p>}
      {billing}
    </CardContent></Card>
  </div>
}

function PhaseReview({ phase, quote }: { phase: QuoteReviewPhase; quote: Quote }) {
  const __customerText = useCustomerText()

  const breakdown = readPhaseRunBreakdown(phase)
  return <section aria-label={`${phase.position}. ${phase.name}`} className="min-w-0 rounded-md border p-3 sm:p-4">
    <h3 className="font-bold">{phase.position}. {phase.name}</h3>
    <div className="mt-3 grid min-w-0 items-start gap-4 lg:grid-cols-2 lg:gap-x-8">
      <div className="min-w-0 space-y-2"><PhaseDetails phase={phase} breakdown={breakdown} /></div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold"><CustomerText message="m_dfe95783edfe" /></h4>
        {breakdown && breakdown.additionalRuns > 0 ? <p className="mt-1 text-sm text-muted-foreground">{breakdown.additionalRunsPerSample !== null
          ? __customerText('m_0f70e086cbb4', { p0: String(phase.sampleCount), p1: String(breakdown.additionalRunsPerSample), p2: String(breakdown.additionalRunsPerSample === 1 ? 'run' : 'runs'), p3: String(breakdown.additionalRuns) })
          : __customerText('m_9eaf6f2925aa', { p0: String(phase.scope!.sequencingRunCount), p1: String(breakdown.includedRuns), p2: String(breakdown.additionalRuns) })}</p> : null}
        <QuoteLines lines={phase.lines} currency={quote.currency} catalogItemNames={quote.catalogItemNames} compact />
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t pt-2 text-sm"><strong><CustomerText message="m_e3beb8a0c8bd" /></strong><span className="whitespace-nowrap font-semibold tabular-nums">{formatQuoteMoney(phase.acceptedSubtotal, quote.currency)}</span></p>
      </div>
    </div>
  </section>
}

function PhaseDetails({ phase, breakdown }: { phase: QuoteReviewPhase; breakdown: ReturnType<typeof readPhaseRunBreakdown> }) {
  const __customerText = useCustomerText()

  return <>
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      <div><dt className="inline font-bold"><CustomerText message="m_9d7b125807dd" /></dt>{' '}<dd className="inline tabular-nums">{phase.sampleCount}</dd></div>
      <div><dt className="inline font-bold"><CustomerText message="m_bd30e9dadda1" /></dt>{' '}<dd className="inline">{phase.turnaroundBusinessDays} <CustomerText message="m_678280fdac01" /></dd></div>
      {phase.scope ? <><div className="sm:col-span-2"><dt className="inline font-bold"><CustomerText message="m_9a1b086dbfce" /></dt>{' '}<dd className="inline tabular-nums">{phase.scope.sequencingRunCount}</dd></div>
        {phase.scope.runsPerSample !== null ? <div className="sm:col-span-2"><dt className="inline font-bold"><CustomerText message="m_6625e4eb0a45" /></dt>{' '}<dd className="inline tabular-nums">{phase.scope.runsPerSample}{breakdown ? breakdown.additionalRunsPerSample === 0 ? " total (1 included)" : __customerText('m_49c2e83c81c9', { p0: String(breakdown.additionalRunsPerSample) }) : null}</dd></div> : null}</> : null}
    </dl>
    {phase.scope?.sources.length ? <table className="w-full text-left text-sm">
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-1 font-bold"><CustomerText message="m_62cda8311410" /></th><th scope="col" className="pb-1 text-right font-bold"><CustomerText message="m_bc228b269ce0" /></th></tr></thead>
      <tbody>{phase.scope.sources.map((source, index) => <tr key={index} className="border-b last:border-0"><th scope="row" className="py-1 pr-4 font-normal wrap-anywhere">{source.biologicalSource}</th><td className="py-1 text-right tabular-nums">{source.specimenCount}</td></tr>)}</tbody>
    </table> : null}
  </>
}

function ProposedPrice({ order }: { order: LabServiceOrder }) {
  if (order.proposedUnitPrice == null) return null
  const currency = order.proposedCurrency ?? 'USD'
  return <div className="mb-4 border-b pb-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground"><CustomerText message="m_f45c61ee02dd" /></p><p className="mt-1 font-semibold">{formatQuoteMoney(order.proposedUnitPrice, currency)} <CustomerText message="m_99f779ccfb3f" /></p><p className="mt-1 text-sm text-muted-foreground"><CustomerText message="m_ce0ac42fa196" />{formatQuoteMoney(order.proposedUnitPrice * order.requestedSpecimenCount, currency)} <CustomerText message="m_ccb2f8fb3cff" />{order.requestedSpecimenCount} <CustomerText message="m_ef56ef8f5eeb" /></p>{order.priceProposalNote ? <p className="mt-2 text-sm">{order.priceProposalNote}</p> : null}</div>
}
