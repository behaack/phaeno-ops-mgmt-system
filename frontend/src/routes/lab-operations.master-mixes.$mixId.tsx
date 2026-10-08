import { createFileRoute } from '@tanstack/react-router'
import { MasterMixPage } from '#/features/lab-operations/MasterMixDetailV2'

export const Route = createFileRoute('/lab-operations/master-mixes/$mixId')({ component: MasterMixRoute })

function MasterMixRoute() {
  const { mixId } = Route.useParams()
  return <MasterMixPage key={mixId} mixId={mixId} />
}
