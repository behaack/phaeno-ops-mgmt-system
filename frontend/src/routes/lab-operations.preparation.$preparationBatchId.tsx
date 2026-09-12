import { createFileRoute } from '@tanstack/react-router'
import { PreparationBatchPage } from '#/features/lab-operations/PreparationBatchPage'
export const Route = createFileRoute('/lab-operations/preparation/$preparationBatchId')({ component: PreparationRoute })
function PreparationRoute() { const { preparationBatchId } = Route.useParams(); return <PreparationBatchPage batchId={preparationBatchId} /> }
