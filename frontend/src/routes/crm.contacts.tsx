import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from '@tanstack/react-router'
import { CrmContactsPage } from '#/features/crm/CrmContactsPage'
export const Route = createFileRoute('/crm/contacts')({ validateSearch: validateCrmNavigationSearch, component: CrmContactsPage })
