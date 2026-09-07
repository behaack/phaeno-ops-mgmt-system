import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from '@tanstack/react-router'
import { CrmLeadsPage } from '#/features/crm/CrmLeadsPage'
export const Route = createFileRoute('/crm/leads')({ validateSearch: validateCrmNavigationSearch, component: CrmLeadsPage })
