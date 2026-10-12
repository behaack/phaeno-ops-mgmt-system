import { createFileRoute } from '@tanstack/react-router'
import { WebsiteOperationsWorkspace } from '#/features/website-operations/WebsiteOperationsWorkspace'
import { parseWebsiteOperationsSearch } from '#/features/website-operations/website-operations-search'

export const Route = createFileRoute('/website-operations')({
  validateSearch: parseWebsiteOperationsSearch,
  component: WebsiteOperationsWorkspace,
})
