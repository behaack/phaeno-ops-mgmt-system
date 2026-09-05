// Synthetic browser fixture, not an application route.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet } from '@tanstack/react-router'
import { CrmCompanyPeople } from '../../src/features/crm/CrmCompanyPeople'
import { CrmCompanySales } from '../../src/features/crm/CrmCompanySales'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'
applyThemeMode('auto')
const root = createRootRoute({ component: Outlet })
const company = createRoute({ getParentRoute: () => root, path: '/crm/companies/$companyId', component: () => <main className="page-wrap space-y-6 px-4 py-8"><h1 className="text-2xl font-semibold">Synthetic Research Company</h1><CrmCompanyPeople companyId="synthetic-company" accessOrganizationId={null} /><CrmCompanySales companyId="synthetic-company" /></main> })
const contact = createRoute({ getParentRoute: () => root, path: '/crm/contacts/$contactId', component: () => <h1>Synthetic Contact</h1> })
const opportunity = createRoute({ getParentRoute: () => root, path: '/crm/opportunities/$opportunityId', component: () => <h1>Synthetic Opportunity</h1> })
const router = createRouter({ routeTree: root.addChildren([company, contact, opportunity]), history: createMemoryHistory({ initialEntries: ['/crm/companies/synthetic-company'] }) })
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider>)
