import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { listCrmOpportunities } from '#/api/crm'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function CrmCompanySales({ companyId }: { companyId: string }) {
  const opportunities = useQuery({
    queryKey: ['crm-company-opportunities', companyId],
    queryFn: () => listCrmOpportunities({ companyId, pageSize: 100 }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales</CardTitle>
        <CardDescription>
          Opportunities and commercial pursuits owned by Phaeno, separate from the Company&apos;s people.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {(opportunities.data?.items ?? []).map((opportunity) => (
          <Link
            key={opportunity.id}
            to="/crm/opportunities/$opportunityId"
            params={{ opportunityId: opportunity.id }}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{opportunity.name}</span>
              <span className="block text-xs text-muted-foreground">
                {opportunity.ownerName}
              </span>
            </span>
            <Badge variant="outline">{opportunity.stageName}</Badge>
          </Link>
        ))}
        {opportunities.isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">Loading sales…</p>
        ) : null}
        {!opportunities.isLoading && !(opportunities.data?.items.length ?? 0) ? (
          <p className="text-sm text-muted-foreground">No opportunities recorded.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
