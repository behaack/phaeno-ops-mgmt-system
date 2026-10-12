import { Navigate, useSearch } from '@tanstack/react-router'
import { WorkDashboard } from '#/features/work-attention/WorkDashboard'
import { parseWebsiteOperationsSearch } from '#/features/website-operations/website-operations-search'
export function DashboardPage() {
  const search = useSearch({ strict: false })
  return search.dashboardSection === 'webOps'
    ? <Navigate to="/website-operations" search={parseWebsiteOperationsSearch({ requestId: search.requestId, deliveryId: search.deliveryId })} replace />
    : <WorkDashboard />
}
