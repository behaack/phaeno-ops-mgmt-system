import { createFileRoute } from '@tanstack/react-router'

import { DataAssemblyCreatePage } from '#/features/orders/DataAssemblyCreatePage'

export const Route = createFileRoute('/data-assembly/$requestId/edit')({ component: DataAssemblyEditRoute })

function DataAssemblyEditRoute() {
  const { requestId } = Route.useParams()
  return <DataAssemblyCreatePage requestId={requestId} />
}
