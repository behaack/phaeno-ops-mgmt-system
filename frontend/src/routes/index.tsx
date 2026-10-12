import { parseWorkSearch, type WorkSearch } from '#/features/work-attention/work-search'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '#/features/dashboard/DashboardPage'
import { parseDashboardSection, type DashboardSection } from '#/features/dashboard/dashboard-search'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): WorkSearch & { dashboardSection?: DashboardSection; requestId?: string; deliveryId?: string } => ({
    ...parseWorkSearch(search),
    dashboardSection: parseDashboardSection(search.dashboardSection),
    requestId: typeof search.requestId === 'string' ? search.requestId : undefined,
    deliveryId: typeof search.deliveryId === 'string' ? search.deliveryId : undefined,
  }),
  component: DashboardPage,
})
