import { createFileRoute } from '@tanstack/react-router'
import { MaterialLotPage } from '#/features/lab-operations/MaterialLotPage'

export const Route = createFileRoute('/lab-operations/materials/$materialLotId')({ component: MaterialLotRoute })

function MaterialLotRoute() {
  const { materialLotId } = Route.useParams()
  return <MaterialLotPage key={materialLotId} materialLotId={materialLotId} />
}
