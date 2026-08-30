import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'

import { LabOperationsPage, type LabSection } from '#/features/lab-operations/LabOperationsPage'

const labSections: LabSection[] = ['receipt', 'work', 'kits', 'assembly', 'protocols', 'materials', 'equipment', 'batches']

export const Route = createFileRoute('/lab-operations')({
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === 'string' && labSections.includes(search.section as LabSection)
      ? search.section as LabSection
      : undefined,
  }),
  component: LabOperationsRoute,
})

function LabOperationsRoute() {
  const navigate = useNavigate()
  const isChild = useRouterState({ select: (state) => state.location.pathname !== '/lab-operations' })
  const { section } = Route.useSearch()
  return isChild
    ? <Outlet />
    : (
        <LabOperationsPage
          section={section ?? 'receipt'}
          onSectionChange={(nextSection) => void navigate({
            to: '/lab-operations',
            search: { section: nextSection },
            replace: true,
          })}
        />
      )
}
