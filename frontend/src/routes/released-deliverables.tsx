import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { ReleasedDeliverablesPage } from '#/features/file-management/ReleasedDeliverablesPage'
export const Route = createFileRoute('/released-deliverables')({ validateSearch: (value: Record<string, unknown>) => ({ q: typeof value.q === 'string' ? value.q : '', page: Math.max(0, Math.floor(Number(value.page) || 0)) }), component: ReleasesRoute })
function ReleasesRoute() { const child = useRouterState({ select: (state) => state.location.pathname !== '/released-deliverables' }); const search = Route.useSearch(); return child ? <Outlet /> : <ReleasedDeliverablesPage {...search} /> }
