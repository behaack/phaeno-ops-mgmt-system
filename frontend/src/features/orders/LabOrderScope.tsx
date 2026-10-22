import { RecordTableHeader } from '#/components/ui/record-list'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { LabServiceOrder, Quote } from '#/api/order-management'
import { readQuoteService } from './quote-phase-review'
import { OrderRichText } from './order-rich-text'

export function LabOrderScope({ order, quote, showSourceGroups = true, showTotals = true }: { order: LabServiceOrder; quote?: Quote | null; showSourceGroups?: boolean; showTotals?: boolean }) {
  const __customerText = useCustomerText()

  const service = quote ? readQuoteService(quote) : order.requestedServiceName ? { name: order.requestedServiceName, quantity: order.requestedSpecimenCount } : null
  return <section aria-label={__customerText('m_0d944aca9639')} className="space-y-3 text-sm">
    {service ? <div className="space-y-1"><p className="wrap-anywhere"><strong><CustomerText message="m_65d157da69bf" /></strong> {service.name}</p><p><strong><CustomerText message="m_40dc5a2f86a0" /></strong> <span className="tabular-nums">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(service.quantity)}</span> {service.quantity === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')}</p></div> : null}
    <p><strong><CustomerText message="m_eb4e84cbaf6b" /></strong> {(order.requestedSequencingRunCount ?? order.requestedSpecimenCount) > order.requestedSpecimenCount ? <CustomerSourceText source={"Complete each sample’s allocated runs. Reusing available material requires laboratory confirmation."} /> : order.tubeUsePolicyKey === "run_one_with_failure_fallback" ? "Run one tube per specimen; use a reserve only if the attempt fails." : __customerText('m_120041afebd3')}</p>
    {order.description?.trim() && order.description.trim().toLowerCase() !== 'none' ? <p className="whitespace-pre-wrap wrap-anywhere"><strong><CustomerText message="m_60057c1f8264" /></strong> {order.description}</p> : null}
    {order.publicNotes ? <div><p className="font-bold"><CustomerText message="order_public_notes" /></p><OrderRichText value={order.publicNotes} /></div> : null}
    <p><strong><CustomerText message="m_d39c8ce0cc98" /></strong> {order.sampleTypeName ?? 'Not recorded for this earlier order'}</p>
    {showTotals ? <h3 className="font-semibold">{order.requestedSpecimenCount} {order.requestedSpecimenCount === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')} · {order.requestedSequencingRunCount ?? order.requestedSpecimenCount} <CustomerText message="m_ab39ac5729e8" /></h3> : null}
    {showSourceGroups ? order.sourceGroups.length ? <table className="w-full text-left">
      <RecordTableHeader><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium"><CustomerText message="m_62cda8311410" /></th><th scope="col" className="pb-2 text-right font-medium"><CustomerText message="m_bc228b269ce0" /></th></tr></RecordTableHeader>
      <tbody>{order.sourceGroups.map(group => <tr key={group.id} className="border-b last:border-0"><th scope="row" className="py-2 pr-4 font-normal wrap-anywhere">{group.biologicalSource || 'Source not specified'}</th><td className="py-2 text-right tabular-nums">{group.specimenCount}</td></tr>)}</tbody>
    </table> : order.sharedBiologicalSource ? <p>{order.sharedBiologicalSource}</p> : <p className="text-muted-foreground"><CustomerText message="m_dfe53e651f6c" /></p> : null}
  </section>
}
