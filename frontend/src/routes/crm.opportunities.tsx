import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from '@tanstack/react-router'
import { CrmOpportunitiesPage } from '#/features/crm/CrmOpportunitiesPage'
export const Route = createFileRoute('/crm/opportunities')({ validateSearch: validateCrmNavigationSearch, component: CrmOpportunitiesPage })
