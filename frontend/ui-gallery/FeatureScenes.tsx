// Engineering-only reference: actual features, fictional records, strict isolated transport.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, createMemoryHistory, RouterProvider, Outlet } from '@tanstack/react-router'
import { PhaenoSessionContext, type PhaenoSessionContextValue } from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'
import { CustomerLocaleContext } from '#/features/customer-i18n/customer-text'
import { PortalConfirmation } from '#/components/PortalConfirmation'
import { PageHeader } from '#/components/ui/page-header'
import { CrmCompanyDetailPage } from '#/features/crm/CrmCompanyDetailPage'
import { HandoffDialog } from '#/features/crm/CrmCompanyRelationships'
import { CrmRequestCard } from '#/features/crm/CrmRequestCard'
import { ServiceRequestEntitlementsDialog } from '#/features/crm/ServiceRequestEntitlementsDialog'
import { RequestActionDialog } from '#/features/organizations/RequestActionDialog'
import { DepartmentSettingsDialog } from '#/features/organizations/DepartmentSettingsDialog'
import { OrganizationInvitationDialog } from '#/features/invitations/OrganizationInvitationDialog'
import { InvitationReview, InvitationFrame, InvitationAccessSummary } from '#/features/invitations/AcceptInvitePage'
import { BillingConfigurationCard } from '#/features/orders/BillingConfigurationCard'
import { CommercialOrderDraftPage } from '#/features/orders/CommercialOrderDraftPage'
import { SampleShippingConfigurationPanel } from '#/features/orders/configuration/SampleShippingConfigurationPanel'
import { ProtocolVersionBuilderPage } from '#/features/lab-operations/ProtocolVersionBuilderPage'
import { DataAssemblyWorkspace } from '#/features/lab-operations/AssemblyJobs'
import { SourceSampleWorkspace } from '#/features/data-provisioning/SourceSampleWorkspace'
import { DataLibraryPage } from '#/features/data-library/DataLibraryPage'
import { company, request, person, billing, installFeatureData } from './feature-data'
import { FinanceOperationsPanel } from '#/features/orders/FinanceOperationsPanel'
import { TrialDetailPage } from '#/features/trials/TrialDetailPage'
import { SampleShippingPage } from '#/features/sample-shipping/SampleShippingPage'
import { AssemblyQcPage } from '#/features/lab-operations/AssemblyQcPage'
import { GuideWorkflowScene } from './GuideWorkflowScenes'
import './styles.css'

const settings = new URLSearchParams(location.search)
const scene = settings.get('scene') ?? 'company'
const state = settings.get('state') ?? 'ready'
installFeatureData(scene, state)
const customer = scene === 'customer' || scene === 'shipping' || scene === 'customer-results'
const partner = scene === 'partner-assembly'
const prospect = scene === 'trial'
const allowed = state !== 'permission'
const context: PhaenoSessionContextValue = {
  authConfigured: true, authProvider: 'clerk', clerkLoaded: true, signedIn: true, isLoading: false, error: null,
  selectedOrganizationId: customer || prospect || partner ? 'demo-customer' : 'demo-phaeno', selectedDepartmentId: 'demo-department', setSelectedOrganizationId: () => {},
  session: {
    state: 'ready', user: { id: 'demo-author', email: 'alex@example.invalid', firstName: 'Alex', lastName: 'Example', status: 'Active' }, isPlatformAdmin: !customer && !prospect && !partner,
    memberships: [{ membershipId: 'demo-membership', organizationId: customer || prospect || partner ? 'demo-customer' : 'demo-phaeno', organizationName: customer || prospect || partner ? company.name : 'Phaeno', organizationKind: customer ? 'Customer' : prospect ? 'Prospect' : partner ? 'Partner' : 'Phaeno', isOrganizationAdmin: true }],
    selectedOrganization: { organizationId: customer || prospect || partner ? 'demo-customer' : 'demo-phaeno', membershipId: 'demo-membership', isAvailable: true },
    selectedDepartment: { organizationId: 'demo-customer', departmentId: 'demo-department', isAvailable: true, isDepartmentAdmin: true },
    capabilities: { ...noSessionCapabilities, canAccessCrm: allowed, canAdministerCrm: allowed, canManageLabProtocols: allowed, canManageDatasetDrafts: allowed, canOperateLabWork: allowed, canManageLabOperations: allowed, canViewOrganizationDatasets: allowed, canCreateLabServiceRequests: allowed, canQuoteLabServiceWork: allowed, canViewTrialProjects: allowed, canViewSampleShipping: allowed, canViewDataAssemblyRequests: allowed, canViewLabServiceOrders: allowed },
  },
}
const noop = () => {}
function FeatureScene() {
  if (scene === '05-accept-invitation') {
    const invitation = { organizationName: company.name, email: person.email!, firstName: person.firstName, lastName: person.lastName, expiresAt: '2026-10-29T16:00:00Z', isOrganizationAdmin: false, departments: [{ departmentId: 'demo-department', departmentName: 'Research', isDepartmentAdmin: true }] }
    return <InvitationFrame title={`Alex, you’re invited to ${company.name}`}><InvitationAccessSummary invitation={invitation} /><InvitationReview invitation={invitation} completeAfterSignIn={false} pending={false} emailMatches signedInEmail={person.email!} onAccept={noop} onDecline={noop} /></InvitationFrame>
  }
  if (scene === 'company' || scene === '01-company') return <CrmCompanyDetailPage companyId={company.id} />
  if (scene === 'source') return <SourceSampleWorkspace sourceSampleId="demo-source" />
  if (scene === 'customer') return <DataLibraryPage />
  if (scene === 'finance') return <main className="page-wrap space-y-5 px-4 py-8"><PageHeader title="Finance" description="Fictional invoices and billing records." /><FinanceOperationsPanel apiEnabled canBill={allowed} canManageCash={allowed} canReconcile={allowed} record={!allowed ? {kind:'invoice',id:'demo-invoice'} : undefined} /></main>
  if (scene === 'trial') return <TrialDetailPage trialId="trial-1" />
  if (scene === 'shipping') return <SampleShippingPage />
  if (scene === 'qc') return <AssemblyQcPage jobId="demo-job" />
  if (['order-scope','order-blocked','order-submit','destination','kit-specification','protocol-preview','protocol-approval','partner-assembly','customer-results'].includes(scene)) return <GuideWorkflowScene scene={scene} />
  if (scene === 'assembly-inputs' || scene === 'assembly-jobs') return <main className="page-wrap space-y-6 px-4 py-8"><PageHeader title="Lab operations" description="Sequencing inputs and assembly attempts." /><DataAssemblyWorkspace apiEnabled /></main>
  if (scene === 'protocol-editor') return <ProtocolVersionBuilderPage protocolId="demo-protocol" />
  if (scene === 'customer-order') return <CommercialOrderDraftPage />
  const accessRequest = { ...request, requestNumber: 'DEMO-PRQ-001', requestType: 'Onboarding' as const, requestedServices: [], organizationId: null, summary: 'DEMO — approved Customer online access for Research.', decisionReason: 'Reviewed fictional online-access scope.' }
  return <main className="page-wrap space-y-6 px-4 py-8" data-guide-scene={scene}>
    <PageHeader title={company.name} description="Fictional Customer onboarding demonstration" />
    {scene === '01-department' ? <DepartmentSettingsDialog target="new" pending={false} error={null} onClose={noop} onSubmit={noop} /> : null}
    {scene === '02-access-request' || scene === '07-service-request' ? <HandoffDialog open currentRelationship={scene === '07-service-request' ? 'Customer' : null} opportunities={[]} pending={false} error={null} onOpenChange={noop} onSubmit={noop} /> : null}
    {scene === '03-access-approval' ? <RequestActionDialog action="approve" request={accessRequest} isPending={false} onOpenChange={noop} onSubmit={noop} /> : null}
    {scene === '04-send-invitation' ? <OrganizationInvitationDialog organizationId="demo-customer" organizationName={company.name} contact={{ ...person, email: person.email! }} error={null} isPending={false} onOpenChange={noop} onSubmit={async () => {}} /> : null}

    {scene === '08-approve-services' ? <ServiceRequestEntitlementsDialog request={{ ...request, status: 'PendingReview' }} mode="approve" isPending={false} onOpenChange={noop} onSubmit={noop} /> : null}
    {['06-online-access-complete','09-work-needed','12-ready-to-complete','13-completed-requests'].includes(scene) ? <CrmRequestCard request={scene === '06-online-access-complete' ? { ...accessRequest, organizationId: 'demo-customer', status: 'Applied', applicationNotes: 'Completed automatically after eligible administrator acceptance.' } : scene === '13-completed-requests' ? { ...request, status: 'Applied', applicationNotes: 'Reviewed service permission, billing configuration and Finance approval.' } : request} isPending={false} onAction={noop} onRecover={noop} /> : null}
    {scene === '13-completed-requests' ? <CrmRequestCard request={{ ...accessRequest, id: 'demo-access-request', organizationId: 'demo-customer', status: 'Applied', applicationNotes: 'Completed automatically after eligible administrator acceptance.' }} isPending={false} onAction={noop} onRecover={noop} /> : null}
    {scene === '10-billing-setup' || scene === '11-finance-approval' ? <BillingConfigurationCard apiEnabled customers={[billing]} customersLoading={false} initialOrganizationId="demo-customer" /> : null}
    {scene === '12-record-completion' ? <RequestActionDialog action="apply" request={request} isPending={false} onOpenChange={noop} onSubmit={noop} /> : null}
    {scene === 'sample-type' ? <SampleShippingConfigurationPanel apiEnabled section="sample-types" /> : null}
  </main>
}
const root = createRootRoute({ component: () => <><Outlet /><PortalConfirmation /></> })
const routes = ['/', '/crm/companies/$companyId', '/lab-operations', '/data-provisioning/source-samples/$sourceSampleId', '/data-library', '/sample-shipping-settings', '/finance', '/order-operations/lab-services/trials/$trialId', '/sample-shipping', '/lab-operations/assembly-jobs/$jobId/qc'].map(path => createRoute({ getParentRoute: () => root, path, validateSearch: (search: Record<string, unknown>) => search, component: FeatureScene }))
const entry = scene === 'company' || scene === '01-company' ? '/crm/companies/demo-company?section=people' : scene.startsWith('assembly') ? `/lab-operations?assemblyTab=${scene === 'assembly-jobs' ? 'jobs' : 'inputs'}` : '/'
const router = createRouter({ routeTree: root.addChildren(routes), history: createMemoryHistory({ initialEntries: [entry] }) })
document.documentElement.classList.toggle('dark', settings.get('theme') === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches)
createRoot(document.getElementById('root')!).render(<CustomerLocaleContext.Provider value={{ customer, locale: 'en-US', pseudo: settings.get('pseudo') === 'true' }}><PhaenoSessionContext.Provider value={context}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><RouterProvider router={router} /></QueryClientProvider></PhaenoSessionContext.Provider></CustomerLocaleContext.Provider>)
