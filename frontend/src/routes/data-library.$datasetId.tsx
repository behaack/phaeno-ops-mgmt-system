import { createFileRoute } from '@tanstack/react-router'

import { DatasetDetailPage } from '#/features/data-library/DatasetDetailPage'

export const Route = createFileRoute('/data-library/$datasetId')({
  component: DatasetDetailRoute,
})

function DatasetDetailRoute() {
  const { datasetId } = Route.useParams()
  return <DatasetDetailPage datasetId={datasetId} />
}
