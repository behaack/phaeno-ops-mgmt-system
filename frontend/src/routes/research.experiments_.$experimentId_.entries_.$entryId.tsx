import { createFileRoute } from '@tanstack/react-router'
import { ResearchEntryPage } from '#/features/research/ResearchEntryPage'

export const Route = createFileRoute('/research/experiments_/$experimentId_/entries_/$entryId')({ component: Page })
function Page() {
  const { experimentId, entryId } = Route.useParams()
  return <ResearchEntryPage experimentId={experimentId} entryId={entryId} />
}
