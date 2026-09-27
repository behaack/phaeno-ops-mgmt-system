import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lab-operations/materials/$materialLotId')({ component: MaterialLotRoute })

function MaterialLotRoute() {
  const { materialLotId } = Route.useParams()
  return <Navigate to="/purchasing/materials/$materialLotId" params={{ materialLotId }} replace />
}
