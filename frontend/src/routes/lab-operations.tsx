import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

import { parseLabSection } from '#/features/lab-operations/lab-sections'

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>): { section?: LabSection; shipmentId?: string } => ({
    shipmentId: typeof search.shipmentId === 'string' && /^[0-9a-f-]{36}$/i.test(search.shipmentId) ? search.shipmentId : undefined,
    section: parseLabSection(search.section),
  }),
  component: LabOperationsRoute,
})

function LabOperationsRoute() {
  const navigate = useNavigate()
  const isChild = useRouterState({ select: (state) => state.location.pathname !== '/lab-operations' })
  const { section, shipmentId } = Route.useSearch()
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={section ?? 'receipt'}
          shipmentId={shipmentId}
          onSectionChange={(nextSection) => void navigate({
            to: '/lab-operations',
            search: { section: nextSection },
            replace: true,
          })}
        />
      )
}
