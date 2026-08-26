import { createFileRoute } from '@tanstack/react-router'
import { CrmOpportunityDetailPage } from '#/features/crm/CrmOpportunityDetailPage'
export const Route = createFileRoute('/crm/opportunities/$opportunityId')({ component: OpportunityRoute })
function OpportunityRoute() { const { opportunityId } = Route.useParams(); return <CrmOpportunityDetailPage opportunityId={opportunityId} /> }
