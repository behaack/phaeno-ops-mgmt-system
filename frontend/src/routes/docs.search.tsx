import { createFileRoute } from '@tanstack/react-router'
import { DocumentationSearchPage } from '#/features/documentation/DocumentationSearch'
import { documentationSearchParams } from '#/features/documentation/documentation-search'

export const Route = createFileRoute('/docs/search')({
  validateSearch: documentationSearchParams,
  component: DocumentationSearchPage,
})
