import { createFileRoute } from '@tanstack/react-router'
import { CrmLeadsPage } from '#/features/crm/CrmLeadsPage'
export const Route = createFileRoute('/crm/leads')({ component: CrmLeadsPage })
