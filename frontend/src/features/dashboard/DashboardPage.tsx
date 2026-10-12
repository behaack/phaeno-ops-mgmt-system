import { useSearch } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { usePhaenoSession } from '#/features/auth/session-context'
import { WorkDashboard } from '#/features/work-attention/WorkDashboard'
const DashboardPanelSelector = lazy(() => import('./DashboardPanelSelector').then(module => ({ default: module.DashboardPanelSelector })))
export function DashboardPage() {
  const { session } = usePhaenoSession()
  const search = useSearch({ strict: false })
  return session?.isPlatformAdmin && search.dashboardSection === 'webOps'
    ? <Suspense fallback={<p className="page-wrap py-8" role="status">Loading Web Operations…</p>}><DashboardPanelSelector webOnly /></Suspense>
    : <WorkDashboard />
}
