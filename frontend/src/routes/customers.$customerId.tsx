import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { getCrmCompanyByAccessOrganization } from '#/api/crm'
import { CrmCompanyDetailPage } from '#/features/crm/CrmCompanyDetailPage'
import { CrmShell } from '#/features/crm/CrmShell'

export const Route = createFileRoute('/customers/$customerId')({
  component: OrganizationDetailRoute,
})

function OrganizationDetailRoute() {
  const { customerId } = Route.useParams()
  const company = useQuery({
    queryKey: ['crm-company-by-access', customerId],
    queryFn: () => getCrmCompanyByAccessOrganization(customerId),
  })

  if (company.isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status" className="text-sm text-muted-foreground">Opening Company…</p></main>
  }

  if (!company.data) {
    return <main className="page-wrap px-4 py-8"><p className="text-sm text-muted-foreground">This legacy access link is not attached to a CRM Company.</p></main>
  }

  return <CrmShell><CrmCompanyDetailPage companyId={company.data.id} /></CrmShell>
}
