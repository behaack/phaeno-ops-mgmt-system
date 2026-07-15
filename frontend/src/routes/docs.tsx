import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DocumentationPage } from '#/features/documentation/DocumentationPage'

export const Route = createFileRoute('/docs')({
  component: DocumentationRoute,
})

function DocumentationRoute() {
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/docs',
  })

  return isChildRoute ? <Outlet /> : <DocumentationPage />
}
