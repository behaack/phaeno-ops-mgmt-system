import { TriangleAlert } from 'lucide-react'
import type { Quote } from '#/api/order-management'
import { OrderStatusBadge } from './OrderStatusBadge'
import { readQuoteLines, type QuoteReviewLine } from './quote-phase-review'

export function QuoteSummary({ quote, status = quote.status }: { quote: Quote; status?: string }) {
  return <div><QuoteHeader quote={quote} status={status} /><QuoteLines lines={readQuoteLines(quote.linesJson)} currency={quote.currency} catalogItemNames={quote.catalogItemNames} /><QuoteTotals quote={quote} /></div>
}

export function QuoteHeader({ quote, status = quote.status }: { quote: Quote; status?: string }) {
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">Revision {quote.revision}</span><OrderStatusBadge status={status} /></div>
    {status === 'Expired' ? <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Expired on {formatDate(quote.expiresAt)}</p>
      : status === 'Accepted' ? quote.acceptedAt ? <p className="mt-1 text-sm text-muted-foreground">Accepted {formatDate(quote.acceptedAt)}</p> : null
      : <p className="mt-1 text-sm text-muted-foreground">Expires {formatDate(quote.expiresAt)}</p>}
    {quote.pricingDecision ? <p className="mt-1 text-sm text-muted-foreground">{pricingDecisionLabel(quote.pricingDecision)}</p> : null}
  </div>
}

export function QuoteLines({ lines, currency, catalogItemNames, compact = false }: { lines: QuoteReviewLine[]; currency: string; catalogItemNames?: Record<string, string> | null; compact?: boolean }) {
  return lines.length ? <ul className="mt-2 divide-y">
    {lines.map((line, index) => <li key={`${line.description}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 text-sm">
      <div className="min-w-0 wrap-anywhere">{compact ? <p>{lineLabel(line, catalogItemNames)}{' '}<span className="inline-block whitespace-nowrap tabular-nums">{line.quantity} × {formatQuoteMoney(line.unitPrice, currency)}</span></p> : <><p>{lineLabel(line, catalogItemNames)}</p><p className="mt-1 text-muted-foreground">{line.quantity} × {formatQuoteMoney(line.unitPrice, currency)} each</p></>}</div>
      <span className="whitespace-nowrap text-right tabular-nums">{formatQuoteMoney(line.quantity * line.unitPrice, currency)}</span>
    </li>)}
  </ul> : null
}

function lineLabel(line: QuoteReviewLine, names?: Record<string, string> | null) {
  if (line.pricingComponent === 'AdditionalRun') return 'Additional sequencing runs'
  if (line.pricingComponent === 'StandardSample' && line.catalogItemId && names?.[line.catalogItemId]) return names[line.catalogItemId]
  return line.description
}

export function QuoteTotals({ quote }: { quote: Quote }) {
  const taxIncluded = Boolean(quote.taxDecisionSnapshotJson)
  return <div className="mt-3 space-y-2 border-t pt-3 text-sm">
    <div className="flex justify-between gap-3"><span>Subtotal</span><span className="whitespace-nowrap tabular-nums">{formatQuoteMoney(quote.subtotal, quote.currency)}</span></div>
    {taxIncluded ? <div className="flex justify-between gap-3"><span>Tax</span><span className="whitespace-nowrap tabular-nums">{formatQuoteMoney(quote.tax, quote.currency)}</span></div> : null}
    <div className="flex justify-between gap-3 font-bold"><span>{taxIncluded ? 'Total' : 'Pre-tax total'}</span><span className="whitespace-nowrap tabular-nums">{formatQuoteMoney(quote.total, quote.currency)}</span></div>
    {!taxIncluded ? <p className="text-xs text-muted-foreground">Applicable tax will be calculated at invoicing.</p> : null}
  </div>
}

export function formatQuoteMoney(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
function pricingDecisionLabel(decision: NonNullable<Quote['pricingDecision']>) {
  if (decision === 'ApprovedAsProposed') return 'Phaeno approved the proposed unit price.'
  if (decision === 'AmendedProposal') return 'Phaeno amended the proposed unit price when issuing this quote.'
  return 'Phaeno set the price when issuing this quote.'
}
