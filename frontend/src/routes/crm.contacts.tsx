import { createFileRoute } from '@tanstack/react-router'
import { CrmContactsPage } from '#/features/crm/CrmContactsPage'
export const Route = createFileRoute('/crm/contacts')({ component: CrmContactsPage })
