import { createFileRoute } from '@tanstack/react-router'

import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { CrmPortalAccessPage } from '#/features/crm/CrmPortalAccessPage'

export const Route = createFileRoute('/crm/requests')({
  validateSearch: validateCrmNavigationSearch,
  component: CrmPortalAccessPage,
})
