import { createFileRoute } from '@tanstack/react-router'

import { DocumentationPage } from '#/features/documentation/DocumentationPage'

export const Route = createFileRoute('/docs/$audience/$slug')({
  component: DocumentationGuideRoute,
})

function DocumentationGuideRoute() {
  const { audience, slug } = Route.useParams()
  return <DocumentationPage audience={audience} slug={slug} />
}
