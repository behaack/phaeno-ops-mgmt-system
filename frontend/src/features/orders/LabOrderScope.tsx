import type { LabServiceOrder } from '#/api/order-management'

export function LabOrderScope({ order }: { order: LabServiceOrder }) {
  return <section aria-label="Samples in this order" className="mb-4 space-y-3 border-b pb-4 text-sm">
    <p><strong>Tube use:</strong> {order.tubeUsePolicyKey === "run_one_with_failure_fallback" ? "Run one tube per specimen; use a reserve only if the attempt fails." : "Policy not recorded for this order."}</p>
    {order.description ? <p className="whitespace-pre-wrap wrap-anywhere">{order.description}</p> : null}
    <h3 className="font-semibold">{order.requestedSpecimenCount} {order.requestedSpecimenCount === 1 ? 'sample' : 'samples'} in this order</h3>
    {order.sourceGroups.length ? <table className="w-full text-left">
      <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">Biological source</th><th scope="col" className="pb-2 text-right font-medium">Samples</th></tr></thead>
      <tbody>{order.sourceGroups.map(group => <tr key={group.id} className="border-b last:border-0"><th scope="row" className="py-2 pr-4 font-normal wrap-anywhere">{group.biologicalSource || 'Source not specified'}</th><td className="py-2 text-right tabular-nums">{group.specimenCount}</td></tr>)}</tbody>
    </table> : order.sharedBiologicalSource ? <p>{order.sharedBiologicalSource}</p> : <p className="text-muted-foreground">Biological-source details are not available.</p>}
  </section>
}
