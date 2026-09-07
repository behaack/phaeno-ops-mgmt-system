import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '#/features/dashboard/DashboardPage'
import { parseDashboardSection, type DashboardSection } from '#/features/dashboard/DashboardPanelSelector'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { dashboardSection?: DashboardSection } => ({
    dashboardSection: parseDashboardSection(search.dashboardSection),
  }),
  component: DashboardPage,
})
