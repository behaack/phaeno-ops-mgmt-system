import { Link } from '@tanstack/react-router'
import type { SessionCapabilities } from '#/api/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { canAccessOperationalAttention, getOrderSections } from '#/features/orders/order-sections'
import { ConnectedOperationsSummary } from './ConnectedOperationsSummary'

export function OrderOperationsSummary({ capabilities }: { capabilities?: SessionCapabilities }) {
  if (capabilities?.canManageOrderConfiguration) {
    return <ConnectedOperationsSummary section="orders" canViewAttention={canAccessOperationalAttention(capabilities)} />
  }

  const sections = getOrderSections(capabilities)
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Order operations</CardTitle>
      <CardDescription>Open a workspace to review your current work.</CardDescription>
    </CardHeader>
    <CardContent className="p-4">
      {sections.length ? <ul className="divide-y" aria-label="Available order workspaces">
        {sections.map(section => <li key={section.value} className="py-3 first:pt-0 last:pb-0">
          <Link to="/order-operations" search={{ orderSection: section.value }} className="font-medium text-primary underline underline-offset-4">{section.label}</Link>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </li>)}
      </ul> : <p>No order workspaces are assigned to your role.</p>}
    </CardContent>
  </Card>
}
