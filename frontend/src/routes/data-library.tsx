import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataLibraryPage } from '#/features/data-library/DataLibraryPage'

export const Route = createFileRoute('/data-library')({
  validateSearch: (search: Record<string, unknown>): { jobId?: string } => {
    const jobId = typeof search.jobId === 'string' && uuidPattern.test(search.jobId)
      ? search.jobId
      : undefined
    return jobId ? { jobId } : {}
  },
  component: DataLibraryRoute,
})

function DataLibraryRoute() {
  const { jobId } = Route.useSearch()
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/data-library',
  })
  return isChildRoute ? <Outlet /> : <DataLibraryPage jobId={jobId} />
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
