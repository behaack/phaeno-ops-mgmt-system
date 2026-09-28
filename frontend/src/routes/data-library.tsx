import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DataLibraryPage } from '#/features/data-library/DataLibraryPage'

export const Route = createFileRoute('/data-library')({
  component: DataLibraryRoute,
})

function DataLibraryRoute() {
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/data-library',
  })
  return isChildRoute ? <Outlet /> : <DataLibraryPage />
}
