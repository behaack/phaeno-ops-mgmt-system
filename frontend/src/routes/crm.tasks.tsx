import { createFileRoute } from '@tanstack/react-router'
import { CrmTasksPage } from '#/features/crm/CrmTasksPage'
export const Route = createFileRoute('/crm/tasks')({ component: CrmTasksPage })
