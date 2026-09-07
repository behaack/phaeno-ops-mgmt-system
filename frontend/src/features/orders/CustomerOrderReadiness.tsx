import { Link } from '@tanstack/react-router'
import type { CustomerOrderReadiness as Readiness, OrderReadinessBlocker } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

export function CustomerOrderReadiness({ readiness }: { readiness: Readiness }) {
  return <section aria-label="Customer readiness" className="mt-4 space-y-3">
    <Alert variant={readiness.canStartPricing ? 'default' : 'destructive'}>
      <AlertTitle>{readiness.canStartPricing ? 'Ready to start pricing' : 'Before starting pricing'}</AlertTitle>
      <AlertDescription>
        {readiness.canStartPricing
          ? 'You can create this order for pricing. Quote and invoice requirements below can be completed later.'
          : <Blockers items={readiness.startPricingBlockers} />}
      </AlertDescription>
    </Alert>
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">Later requirements · Quote: {readiness.quoteBlockers.length} · Invoice: {readiness.invoiceBlockers.length}</summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-muted-foreground">These are additional requirements after pricing can start. They do not block order creation.</p>
        <div><h3 className="font-medium">Before issuing a quote</h3><Blockers items={readiness.quoteBlockers} /></div>
        <div><h3 className="font-medium">Before invoicing</h3><Blockers items={readiness.invoiceBlockers} /></div>
      </div>
    </details>
  </section>
}

function Blockers({ items }: { items: OrderReadinessBlocker[] }) {
  return items.length ? <ul className="mt-1 list-disc space-y-1 pl-5">
    {items.map(item => <li key={item.code}><span className="font-medium">{item.label}:</span> {item.nextAction} <SetupLink code={item.code} /></li>)}
  </ul> : <p className="text-muted-foreground">No additional setup requirements.</p>
}

function SetupLink({ code }: { code: string }) {
  const section = code === 'ActivePSeqOfferingRequired' ? 'catalog' : code === 'ShippingConfigurationIncomplete' || code === 'SampleConfigurationIncomplete' ? 'shipping' : ['OrderConfigurationIncomplete', 'ResultDestinationIncomplete', 'SubmissionInstructionsIncomplete'].includes(code) ? 'system' : null
  if (section) return <Link className="underline underline-offset-4" to="/order-configuration" search={{ configurationSection: section }}>Open setup</Link>
  if (['BillingContactIncomplete', 'BillingAddressIncomplete', 'PaymentTermsIncomplete', 'TaxDecisionIncomplete', 'FinanceTaxApprovalRequired'].includes(code)) return <Link className="underline underline-offset-4" to="/order-operations" search={{ orderSection: 'finance', financeSection: 'customers' }}>Open Finance</Link>
  return null
}
