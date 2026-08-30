import { createFileRoute } from '@tanstack/react-router'
import { CrmOpportunitiesPage } from '#/features/crm/CrmOpportunitiesPage'
export const Route = createFileRoute('/crm/opportunities')({ component: CrmOpportunitiesPage })
