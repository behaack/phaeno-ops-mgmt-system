import { createFileRoute } from '@tanstack/react-router'

import { CrmContactDetailPage } from '#/features/crm/CrmContactDetailPage'

export const Route = createFileRoute('/crm/contacts_/$contactId')({
  component: ContactRoute,
})

function ContactRoute() {
  const { contactId } = Route.useParams()
  return <CrmContactDetailPage contactId={contactId} />
}
