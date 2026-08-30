import { createFileRoute } from '@tanstack/react-router'

import { CrmCompanyDetailPage } from '#/features/crm/CrmCompanyDetailPage'

export const Route = createFileRoute('/crm/companies_/$companyId')({
  component: CrmCompanyRoute,
})

function CrmCompanyRoute() {
  const { companyId } = Route.useParams()
  return <CrmCompanyDetailPage companyId={companyId} />
}
