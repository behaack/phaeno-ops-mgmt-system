import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from '@tanstack/react-router'
import { CrmCompaniesPage } from '#/features/crm/CrmCompaniesPage'

export const Route = createFileRoute('/crm/companies')({ validateSearch: validateCrmNavigationSearch, component: CrmCompaniesPage })
