import { Navigate, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
export const Route = createFileRoute('/trial-projects')({ validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === 'string' ? search.q : '', status: typeof search.status === 'string' ? search.status : '', owner: typeof search.owner === 'string' ? search.owner : '', requestId: typeof search.requestId === 'string' ? search.requestId : undefined, fromCompanyId: typeof search.fromCompanyId === 'string' ? search.fromCompanyId : undefined }), component: LegacyTrialsRoute })
function LegacyTrialsRoute() {
  const nested = useRouterState({ select: state => state.location.pathname !== '/trial-projects' })
  const search = Route.useSearch()
  return nested ? <Outlet /> : <Navigate to="/order-operations/lab-services/trials" search={search} replace />
}
