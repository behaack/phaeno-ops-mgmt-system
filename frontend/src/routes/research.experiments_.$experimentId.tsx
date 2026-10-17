import { createFileRoute } from '@tanstack/react-router'
import { ResearchExperimentPage } from '#/features/research/ResearchExperimentPage'
export const Route = createFileRoute('/research/experiments_/$experimentId')({ component: Page })
function Page() { return <ResearchExperimentPage experimentId={Route.useParams().experimentId} /> }
