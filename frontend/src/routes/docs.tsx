import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DocumentationPage, DocumentationLayout } from '#/features/documentation/DocumentationPage'

export const Route = createFileRoute('/docs')({
  component: DocumentationRoute,
})

function DocumentationRoute() {
  const isChildRoute = useRouterState({
    select: (state) => state.location.pathname !== '/docs',
  })

  return <DocumentationLayout>{isChildRoute ? <Outlet /> : <DocumentationPage />}</DocumentationLayout>
}
