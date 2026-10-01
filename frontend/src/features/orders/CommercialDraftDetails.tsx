import { Link } from '@tanstack/react-router'
import type { LabServiceOrder } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { draftTotals, phaseTotals } from './commercial-draft'
import { OrderStatusBadge } from './OrderStatusBadge'

export function CommercialDraftDetails({ order, canEdit }: { order: LabServiceOrder; canEdit: boolean }) {
  const draft = order.commercialDraft!
  const totals = draftTotals(draft)
  return <main className="page-wrap space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Link to="/order-operations" search={previous => ({ ...previous, orderSection: 'intake' })} className="text-sm text-primary hover:underline">Order intake</Link><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold">{draft.jobName}</h1><OrderStatusBadge status="DraftRequest" /></div><p className="mt-2 text-sm text-muted-foreground">Order {order.orderNumber} · Saved Draft · Version {order.version}</p></div>
      {canEdit ? <Button asChild variant="outline"><Link to="/order-operations/drafts/$orderId/edit" params={{ orderId: order.id }}>Edit draft</Link></Button> : null}
    </header>
    <p className="text-sm text-muted-foreground">This Draft has not been submitted for pricing. Complete the order details, then submit it from Edit draft.</p>
    <Card><CardHeader><CardTitle>Order summary</CardTitle></CardHeader><CardContent><p>{totals.samples} samples · {totals.runs} sequencing runs{draft.usesPhases ? ` · ${draft.phases.length} phases` : ''}</p><p className="mt-2">Customer {order.organizationId} · Department {order.departmentId}</p></CardContent></Card>
    {draft.phases.map((phase, index) => { const scope = phaseTotals(phase); return <Card key={index}><CardHeader><CardTitle>{draft.usesPhases ? phase.name || `Phase ${index + 1}` : 'Samples and pricing'}</CardTitle></CardHeader><CardContent className="space-y-3"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Samples</dt><dd>{scope.samples}</dd></div><div><dt className="text-sm text-muted-foreground">Sequencing runs per sample</dt><dd>{phase.runsPerSample ?? 'Not entered'}</dd></div><div><dt className="text-sm text-muted-foreground">Proposed price per sample</dt><dd>{!phase.proposePrice || phase.proposedUnitPrice === null ? 'No price proposed' : money(phase.proposedUnitPrice)}</dd></div>{scope.additionalRuns > 0 ? <div><dt className="text-sm text-muted-foreground">Proposed price per additional run</dt><dd>{!phase.proposePrice || phase.proposedAdditionalRunPrice == null ? 'No price proposed' : money(phase.proposedAdditionalRunPrice)} · {scope.additionalRuns} additional runs</dd></div> : null}<div><dt className="text-sm text-muted-foreground">Proposed subtotal</dt><dd>{scope.proposed === null ? 'No price proposed' : money(scope.proposed)}</dd></div></dl><ul className="divide-y">{phase.sources.map((source, i) => <li key={i} className="py-2 text-sm">{source.biologicalSource || 'Source not entered'} · {source.specimenCount} samples</li>)}</ul>{phase.pricingNote ? <p className="whitespace-pre-wrap text-sm">{phase.pricingNote}</p> : null}</CardContent></Card> })}
    <Card><CardHeader><CardTitle>Handling and notes</CardTitle></CardHeader><CardContent><dl className="space-y-4">{(['storageRequirements', 'safetyDeclaration', 'notes'] as const).map(key => <div key={key}><dt className="font-medium">{key === 'storageRequirements' ? 'Storage requirements' : key === 'safetyDeclaration' ? 'Safety declaration' : 'Job notes'}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{key === 'storageRequirements' && draft[key] === null ? 'Use Sample type requirements' : draft[key] || 'Not entered'}</dd></div>)}</dl></CardContent></Card>
  </main>
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
