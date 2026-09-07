import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { apiErrorMessage, createCrmOpportunity, listCrmOpportunities, listCrmPipelines, getCrmCompany, type CrmCompany, type CrmOpportunityInput } from '#/api/crm'
import { useState } from 'react'
import { CrmOpportunityDialog } from './CrmOpportunityDialog'
import { Button } from '#/components/ui/button'
import { CrmListPagination } from './CrmListNavigation'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { CrmCollectionFeedback } from './CrmCollectionFeedback'

export function CrmCompanySales({ companyId, company }: { companyId: string; company?: CrmCompany }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const companyQuery = useQuery({ queryKey: ['crm-company', companyId], queryFn: () => getCrmCompany(companyId), enabled: open && !company })
  const resolvedCompany = company ?? companyQuery.data
  const pipelines = useQuery({ queryKey: ['crm-pipelines'], queryFn: () => listCrmPipelines(), enabled: open })
  const create = useMutation({ mutationFn: (input: CrmOpportunityInput) => createCrmOpportunity({ ...input, companyId }), onSuccess: async () => { setOpen(false); await client.invalidateQueries({ queryKey: ['crm-company-opportunities', companyId] }); await client.invalidateQueries({ queryKey: ['crm-opportunities'] }) } })
  const opportunities = useQuery({
    queryKey: ['crm-company-opportunities', companyId, page],
    queryFn: () => listCrmOpportunities({ companyId, page, pageSize: 25 }),
  })

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Sales</CardTitle><Button size="sm" onClick={() => { create.reset(); setOpen(true) }}>New opportunity</Button></div>
        <CardDescription>
          Opportunities and commercial pursuits owned by Phaeno, separate from the Company&apos;s people.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <CrmCollectionFeedback name="opportunities" query={opportunities} />
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
        {opportunities.isSuccess && opportunities.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities recorded.</p>
        ) : null}
        <CrmListPagination result={opportunities.data} page={page} onPageChange={setPage} busy={opportunities.isFetching} />
      </CardContent>
    </Card>
    {open ? <CrmOpportunityDialog open companyId={companyId} companies={resolvedCompany ? [resolvedCompany] : []} pipelines={pipelines.data ?? []} pending={create.isPending || pipelines.isPending || (!company && companyQuery.isPending)} error={create.error || pipelines.error || companyQuery.error ? apiErrorMessage(create.error ?? pipelines.error ?? companyQuery.error) : undefined} onOpenChange={setOpen} onSubmit={input => create.mutate(input)} /> : null}
    </>
  )
}
