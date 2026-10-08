import { validateCrmNavigationSearch } from '#/features/crm/CrmListNavigation'
import { createFileRoute } from '@tanstack/react-router'
import { CrmTasksPage } from '#/features/crm/CrmTasksPage'
export const Route = createFileRoute('/crm/tasks')({ validateSearch: validateCrmNavigationSearch, component: CrmTasksPage })
