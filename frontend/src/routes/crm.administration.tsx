import { createFileRoute } from '@tanstack/react-router'
import { CrmAdministrationPage } from '#/features/crm/CrmAdministrationPage'
export const Route = createFileRoute('/crm/administration')({ component: CrmAdministrationPage })
