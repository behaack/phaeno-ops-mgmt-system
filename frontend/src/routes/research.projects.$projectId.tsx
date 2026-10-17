import { createFileRoute } from '@tanstack/react-router'
import { ResearchProjectPage } from '#/features/research/ResearchProjectPage'
export const Route = createFileRoute('/research/projects/$projectId')({ component: Page })
function Page() { return <ResearchProjectPage projectId={Route.useParams().projectId} /> }
