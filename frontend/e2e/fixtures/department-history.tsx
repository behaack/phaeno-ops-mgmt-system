// Browser-only test entry, never imported by the application bundle.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataLibraryPage } from '../../src/features/data-library/DataLibraryPage'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '../../src/features/auth/session-context'
import { configureApiAuth } from '../../src/api/client'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
let requestDepartment = 'general'
configureApiAuth({ getSelectedOrganizationId: () => 'organization', getSelectedDepartmentId: () => requestDepartment })
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

function Fixture() {
  const [department, setDepartment] = useState('general')
  const [admin, setAdmin] = useState(true)
  const context: PhaenoSessionContextValue = {
    authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
    selectedOrganizationId: 'organization', selectedDepartmentId: department, setSelectedOrganizationId: () => undefined,
    session: {
      state: 'ready', user: { id: 'user', email: 'admin@example.test', firstName: 'Scope', lastName: 'Admin', status: 'Active' },
      memberships: [{ membershipId: 'membership', organizationId: 'organization', organizationName: 'Synthetic', organizationKind: 'Customer', isOrganizationAdmin: false }],
      isPlatformAdmin: false,
      selectedOrganization: { organizationId: 'organization', membershipId: 'membership', isAvailable: true },
      selectedDepartment: { departmentId: department, organizationId: 'organization', isAvailable: true, isDepartmentAdmin: admin },
      capabilities: { ...noSessionCapabilities, canViewOrganizationDatasets: true },
    },
  }
  return <QueryClientProvider client={client}><PhaenoSessionContext.Provider value={context}>
    <nav aria-label="Test context" className="flex flex-wrap gap-3 p-4">
      <button type="button" className="cursor-pointer rounded border p-2 focus-visible:ring" onClick={() => { requestDepartment = 'research'; setDepartment('research') }}>Switch to Research</button>
      <button type="button" className="cursor-pointer rounded border p-2 focus-visible:ring" onClick={() => setAdmin(false)}>Use member rights</button>
    </nav>
    <DataLibraryPage />
  </PhaenoSessionContext.Provider></QueryClientProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
