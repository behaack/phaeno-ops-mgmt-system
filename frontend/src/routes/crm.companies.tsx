import { createFileRoute } from '@tanstack/react-router'
import { CrmCompaniesPage } from '#/features/crm/CrmCompaniesPage'

export const Route = createFileRoute('/crm/companies')({ component: CrmCompaniesPage })
