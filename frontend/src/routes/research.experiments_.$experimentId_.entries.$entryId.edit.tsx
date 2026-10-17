import { createFileRoute } from '@tanstack/react-router'
import { ResearchEntryEditor } from '#/features/research/ResearchEntryEditor'
export const Route = createFileRoute('/research/experiments_/$experimentId_/entries/$entryId/edit')({ component: Page })
function Page() { const { experimentId, entryId } = Route.useParams(); return <ResearchEntryEditor experimentId={experimentId} entryId={entryId} /> }
