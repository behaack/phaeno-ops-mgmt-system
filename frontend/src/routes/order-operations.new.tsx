import { createFileRoute } from '@tanstack/react-router'
import { CommercialOrderDraftPage } from '#/features/orders/CommercialOrderDraftPage'
export const Route = createFileRoute('/order-operations/new')({
  validateSearch: (search: Record<string, unknown>) => ({ organizationId: typeof search.organizationId === 'string' ? search.organizationId : undefined, sourceRequestId: typeof search.sourceRequestId === 'string' ? search.sourceRequestId : undefined }),
  component: NewOrderRoute,
})
function NewOrderRoute() { const search = Route.useSearch(); return <CommercialOrderDraftPage {...search} /> }
