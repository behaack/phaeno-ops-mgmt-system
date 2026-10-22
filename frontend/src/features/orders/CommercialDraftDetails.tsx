import { PageTitle } from '#/components/ui/page-header'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { Link } from '@tanstack/react-router'
import type { LabServiceOrder } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { draftTotals, phaseTotals } from './commercial-draft'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderRichText } from './order-rich-text'

export function CommercialDraftDetails({ order, canEdit }: { order: LabServiceOrder; canEdit: boolean }) {
  const draft = order.commercialDraft!
  const totals = draftTotals(draft)
  return <main className="page-wrap space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Link to="/order-operations/lab-services" search={previous => ({ ...previous })} className="text-sm text-primary hover:underline"><CustomerSourceText source={"Order intake"} /></Link><div className="mt-2 flex flex-wrap items-center gap-3"><PageTitle>{draft.jobName}</PageTitle><OrderStatusBadge status="DraftRequest" /></div><p className="mt-2 text-sm text-muted-foreground"><CustomerSourceText source={"Order"} /> {order.orderNumber} <CustomerSourceText source={"· Saved Draft · Version"} /> {order.version}</p></div>
      {canEdit ? <Button asChild variant="outline"><Link to="/order-operations/lab-services/drafts/$orderId/edit" params={{ orderId: order.id }}><CustomerSourceText source={"Edit draft"} /></Link></Button> : null}
    </header>
    <p className="text-sm text-muted-foreground"><CustomerSourceText source={"This Draft has not been submitted for pricing. Complete the order details, then submit it from Edit draft."} /></p>
    <Card><CardHeader><CardTitle><CustomerSourceText source={"Order summary"} /></CardTitle></CardHeader><CardContent><p><strong><CustomerSourceText source={"Catalog service:"} /></strong> {order.requestedServiceName ?? 'Not selected'}</p><p className="mt-2">{totals.samples} <CustomerSourceText source={"samples ·"} /> {totals.runs} <CustomerSourceText source={"sequencing runs"} />{draft.usesPhases ? ` · ${draft.phases.length} phases` : ''}</p><p className="mt-2"><CustomerSourceText source={"Customer"} /> {order.organizationId} <CustomerSourceText source={"· Department"} /> {order.departmentId}</p></CardContent></Card>
    {draft.phases.map((phase, index) => {
      const scope = phaseTotals(phase)
      return <Card key={index}>
        <CardHeader><CardTitle>{draft.usesPhases ? phase.name || `Phase ${index + 1}` : <CustomerSourceText source={"Samples and pricing"} />}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="inline font-bold"><CustomerSourceText source={"Samples:"} /></dt>{' '}<dd className="inline tabular-nums">{scope.samples}</dd></div>
            <div><dt className="inline font-bold"><CustomerSourceText source={"Sequencing runs per sample:"} /></dt>{' '}<dd className="inline tabular-nums">{phase.runsPerSample ?? 'Not entered'}</dd></div>
            <div><dt className="inline font-bold"><CustomerSourceText source={"Proposed price per sample:"} /></dt>{' '}<dd className="inline tabular-nums">{!phase.proposePrice || phase.proposedUnitPrice === null ? <CustomerSourceText source={"No price proposed"} /> : money(phase.proposedUnitPrice)}</dd></div>
            {scope.additionalRuns > 0 ? <div><dt className="inline font-bold"><CustomerSourceText source={"Proposed price per additional run:"} /></dt>{' '}<dd className="inline tabular-nums">{!phase.proposePrice || phase.proposedAdditionalRunPrice == null ? <CustomerSourceText source={"No price proposed"} /> : money(phase.proposedAdditionalRunPrice)} · {scope.additionalRuns} <CustomerSourceText source={"additional runs"} /></dd></div> : null}
            <div><dt className="inline font-bold"><CustomerSourceText source={"Proposed subtotal:"} /></dt>{' '}<dd className="inline tabular-nums">{scope.proposed === null ? <CustomerSourceText source={"No price proposed"} /> : money(scope.proposed)}</dd></div>
          </dl>
          <ul className="divide-y">{phase.sources.map((source, i) => <li key={i} className="py-2 text-sm">{source.biologicalSource || 'Source not entered'} · {source.specimenCount} <CustomerSourceText source={"samples"} /></li>)}</ul>
          {phase.pricingNote ? <p className="whitespace-pre-wrap text-sm">{phase.pricingNote}</p> : null}
        </CardContent>
      </Card>
    })}
    <Card><CardHeader><CardTitle><CustomerSourceText source={"Handling and notes"} /></CardTitle></CardHeader><CardContent><dl className="space-y-4">{(['storageRequirements', 'safetyDeclaration'] as const).map(key => <div key={key}><dt className="font-bold">{key === 'storageRequirements' ? <CustomerSourceText source={"Storage requirements"} /> : 'Safety declaration'}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{key === 'storageRequirements' && draft[key] === null ? <CustomerSourceText source={"Use Sample type requirements"} /> : draft[key] || 'Not entered'}</dd></div>)}{(['privateNotes', 'publicNotes'] as const).map(key => <div key={key}><dt className="font-bold">{key === 'privateNotes' ? 'Private notes · Phaeno only' : 'Public notes · visible to the customer'}</dt><dd className="mt-1 text-sm text-muted-foreground">{draft[key] ? <OrderRichText value={draft[key]} /> : 'Not entered'}</dd></div>)}</dl></CardContent></Card>
  </main>
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) }
