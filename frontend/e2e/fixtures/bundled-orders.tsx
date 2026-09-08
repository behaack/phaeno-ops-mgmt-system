// Isolated UI fixture: every API call is intercepted by the companion browser test.
// This exercises signed-in rendering, not Clerk authentication or production data.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { configureApiAuth } from '../../src/api/client'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '../../src/features/auth/session-context'
import { noSessionCapabilities } from '../../src/test-helpers/session'
import {
  bundleIds,
  bundleKitOrder,
  bundleTiming,
  bundleConfiguration,
} from '../../src/test-helpers/bundled-orders'
import { LabServiceDetailPage } from '../../src/features/orders/LabServiceDetailPage'
import { ReagentOrderDetailPage } from '../../src/features/orders/ReagentOrderDetailPage'
import { DataAssemblyCreatePage } from '../../src/features/orders/DataAssemblyCreatePage'
import { DataAssemblyDetailPage } from '../../src/features/orders/DataAssemblyDetailPage'
import { LabServiceOfferingsPanel } from '../../src/features/orders/configuration/LabServiceOfferingsPanel'
import { ReagentConfigurationPanel } from '../../src/features/orders/configuration/ReagentConfigurationPanel'
import { LabServiceTimingPanel } from '../../src/features/orders/LabServiceTimingPanel'
import { KitAssemblyCasesPanel } from '../../src/features/orders/KitAssemblyCasesPanel'
import { applyThemeMode } from '../../src/components/theme-mode'
import '../../src/styles.css'

applyThemeMode('auto')
const screen =
  new URLSearchParams(window.location.search).get('screen') ?? 'lab'
const staff = screen === 'staff' || screen === 'configuration'
const partner = screen === 'kit' || screen === 'partner-lab'
configureApiAuth({
  getSelectedOrganizationId: () => bundleIds.organization,
  getSelectedDepartmentId: () => bundleIds.department,
})
const context: PhaenoSessionContextValue = {
  authConfigured: true,
  authProvider: 'clerk',
  clerkLoaded: true,
  signedIn: true,
  isLoading: false,
  error: null,
  selectedOrganizationId: bundleIds.organization,
  selectedDepartmentId: bundleIds.department,
  setSelectedOrganizationId: () => undefined,
  session: {
    state: 'ready',
    user: {
      id: bundleIds.unit,
      email: 'training.admin@example.test',
      firstName: 'Training',
      lastName: 'Administrator',
      status: 'Active',
    },
    memberships: [
      {
        membershipId: bundleIds.unit,
        organizationId: bundleIds.organization,
        organizationName: 'Synthetic Research Organization',
        organizationKind: staff ? 'Phaeno' : partner ? 'Partner' : 'Customer',
        isOrganizationAdmin: true,
      },
    ],
    isPlatformAdmin: staff,
    selectedOrganization: {
      organizationId: bundleIds.organization,
      membershipId: bundleIds.unit,
      isAvailable: true,
    },
    selectedDepartment: {
      departmentId: bundleIds.department,
      organizationId: bundleIds.organization,
      isAvailable: true,
      isDepartmentAdmin: true,
      purchaseOrderRequired: true,
    },
    capabilities: {
      ...noSessionCapabilities,
      canViewLabServiceOrders: true,
      canViewLabServiceInvoices: !partner && !staff,
      canViewReagentOrders: true,
      canCreateReagentOrders: true,
      canViewDataAssemblyRequests: true,
      canCreateDataAssemblyRequests: true,
    },
  },
}
const root = createRootRoute({
  component: () => (
    <>
      <p className="border-b bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
        Training example · Synthetic records ·{' '}
        {staff
          ? 'Phaeno operations'
          : partner
            ? 'Partner administrator'
            : 'Customer administrator'}
      </p>
      <Outlet />
    </>
  ),
})
const lab = createRoute({
  getParentRoute: () => root,
  path: '/lab-services/$orderId',
  component: () => <LabServiceDetailPage orderId={bundleIds.order} />,
})
const kit = createRoute({
  getParentRoute: () => root,
  path: '/reagent-orders/$orderId',
  component: () => <ReagentOrderDetailPage orderId={bundleIds.order} />,
})
const assemblyNew = createRoute({
  getParentRoute: () => root,
  path: '/data-assembly/new',
  component: () => (
    <DataAssemblyCreatePage
      kitOrderId={bundleIds.order}
      kitCaseId={bundleIds.case}
    />
  ),
})
const assembly = createRoute({
  getParentRoute: () => root,
  path: '/data-assembly/$requestId',
  component: () => <DataAssemblyDetailPage requestId={bundleIds.request} />,
})
const assemblyEdit = createRoute({
  getParentRoute: () => root,
  path: '/data-assembly/$requestId/edit',
  component: () => <DataAssemblyCreatePage requestId={bundleIds.request} />,
})
const config = createRoute({
  getParentRoute: () => root,
  path: '/configuration',
  component: () => (
    <main className="page-wrap space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">Order configuration</h1>
      <LabServiceOfferingsPanel
        configuration={bundleConfiguration}
        apiEnabled
      />
      <ReagentConfigurationPanel configuration={bundleConfiguration} />
    </main>
  ),
})
const operations = createRoute({
  getParentRoute: () => root,
  path: '/operations',
  component: () => (
    <main className="page-wrap space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">
        Order operations · Training examples
      </h1>
      <LabServiceTimingPanel
        orderId={bundleIds.order}
        timing={bundleTiming}
        staff
      />
      <KitAssemblyCasesPanel order={bundleKitOrder} staff />
    </main>
  ),
})
const path =
  screen === 'kit'
    ? `/reagent-orders/${bundleIds.order}`
    : screen === 'configuration'
      ? '/configuration'
      : screen === 'staff'
        ? '/operations'
        : `/lab-services/${bundleIds.order}`
const router = createRouter({
  routeTree: root.addChildren([
    lab,
    kit,
    assemblyNew,
    assembly,
    assemblyEdit,
    config,
    operations,
  ]),
  history: createMemoryHistory({ initialEntries: [path] }),
})
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    }
  >
    <PhaenoSessionContext.Provider value={context}>
      <RouterProvider router={router} />
    </PhaenoSessionContext.Provider>
  </QueryClientProvider>,
)
