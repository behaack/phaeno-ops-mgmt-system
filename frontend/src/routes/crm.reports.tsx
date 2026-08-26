import { createFileRoute } from '@tanstack/react-router'
import { CrmReportsPage } from '#/features/crm/CrmReportsPage'
export const Route = createFileRoute('/crm/reports')({ component: CrmReportsPage })
