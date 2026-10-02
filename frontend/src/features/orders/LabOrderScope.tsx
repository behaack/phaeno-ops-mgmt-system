import type { LabServiceOrder, Quote } from '#/api/order-management'
import { readQuoteService } from './quote-phase-review'

export function LabOrderScope({ order, quote, showSourceGroups = true, showTotals = true }: { order: LabServiceOrder; quote?: Quote | null; showSourceGroups?: boolean; showTotals?: boolean }) {
  const service = quote ? readQuoteService(quote) : order.requestedServiceName ? { name: order.requestedServiceName, quantity: order.requestedSpecimenCount } : null
  return <section aria-label="Samples in this order" className="space-y-3 text-sm">
    {service ? <div className="space-y-1"><p className="wrap-anywhere"><strong>Service:</strong> {service.name}</p><p><strong>Service quantity:</strong> <span className="tabular-nums">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(service.quantity)}</span> {service.quantity === 1 ? 'sample' : 'samples'}</p></div> : null}
    <p><strong>Tube use:</strong> {(order.requestedSequencingRunCount ?? order.requestedSpecimenCount) > order.requestedSpecimenCount ? "Complete each sample’s allocated runs. Reusing available material requires laboratory confirmation." : order.tubeUsePolicyKey === "run_one_with_failure_fallback" ? "Run one tube per specimen; use a reserve only if the attempt fails." : "Policy not recorded for this order."}</p>
    {order.description?.trim() && order.description.trim().toLowerCase() !== 'none' ? <p className="whitespace-pre-wrap wrap-anywhere"><strong>Order notes:</strong> {order.description}</p> : null}
    <p><strong>Sample type:</strong> {order.sampleTypeName ?? 'Not recorded for this earlier order'}</p>
    {showTotals ? <h3 className="font-semibold">{order.requestedSpecimenCount} {order.requestedSpecimenCount === 1 ? 'sample' : 'samples'} · {order.requestedSequencingRunCount ?? order.requestedSpecimenCount} sample-sequencing runs in this order</h3> : null}
    {showSourceGroups ? order.sourceGroups.length ? <table className="w-full text-left">
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">Biological source</th><th scope="col" className="pb-2 text-right font-medium">Samples</th></tr></thead>
      <tbody>{order.sourceGroups.map(group => <tr key={group.id} className="border-b last:border-0"><th scope="row" className="py-2 pr-4 font-normal wrap-anywhere">{group.biologicalSource || 'Source not specified'}</th><td className="py-2 text-right tabular-nums">{group.specimenCount}</td></tr>)}</tbody>
    </table> : order.sharedBiologicalSource ? <p>{order.sharedBiologicalSource}</p> : <p className="text-muted-foreground">Biological-source details are not available.</p> : null}
  </section>
}
