import { createFileRoute } from '@tanstack/react-router'

import { OrganizationDetailPage } from '#/features/organizations/OrganizationDetailPage'

export const Route = createFileRoute('/customers/$customerId')({
  component: OrganizationDetailRoute,
})

function OrganizationDetailRoute() {
  const { customerId } = Route.useParams()
  return <OrganizationDetailPage organizationId={customerId} />
}
