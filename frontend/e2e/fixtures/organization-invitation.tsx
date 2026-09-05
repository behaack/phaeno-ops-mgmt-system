// Browser-only test entry. This is never imported by the application bundle.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganizationUserManagementPanel } from '../../src/features/admin/OrganizationUserManagementPanel'
import '../../src/styles.css'
import { applyThemeMode } from '../../src/components/theme-mode'

applyThemeMode('auto')

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <main className="page-wrap px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Organization access</h1>
      <OrganizationUserManagementPanel organizationId="northline-labs" organizationName="Northline Labs" currentUserId="current-user" />
    </main>
  </QueryClientProvider>,
)
