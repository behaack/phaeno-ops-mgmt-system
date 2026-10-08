// Synthetic browser fixture, not an application route.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WebOpsDeliveryPanel } from '../../src/features/dashboard/WebOpsDeliveryPanel'
import { WebOpsDashboardContent } from '../../src/features/dashboard/WebOpsDashboardContent'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode('auto')
const mailingList = {
  data: { items: [{ id: 'signup-1', firstName: 'Ada', lastName: 'Example', organizationName: 'Synthetic Scientific Discovery Laboratory', email: 'ada.synthetic@example.test', technicalBriefRequested: true, createdAtUtc: '2026-09-01T12:00:00Z' }], page: 1, pageSize: 10, totalCount: 1 },
  error: null, isLoading: false, onPageChange: () => {}, onRetry: () => {},
}
const demoRequests = {
  data: { items: [{ id: 'demo-1', firstName: 'Grace', lastName: 'Example', organizationName: 'Synthetic Demo Laboratory', email: 'grace.synthetic@example.test', description: 'Please arrange a research workflow demonstration.' }], page: 1, pageSize: 10, totalCount: 1 },
  error: null, isLoading: false, onPageChange: () => {}, onRetry: () => {},
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><main className="page-wrap space-y-6 px-4 py-8"><h1 className="text-2xl font-semibold">Operations dashboard</h1><WebOpsDashboardContent mailingList={mailingList} demoRequests={demoRequests} notificationPanel={<WebOpsDeliveryPanel />} /></main></QueryClientProvider>)
