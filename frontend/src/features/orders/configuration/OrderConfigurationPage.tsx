import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  ChartSpline,
  Landmark,
  RefreshCw,
  Settings,
  Workflow,
  TestTubeDiagonal,
  BookOpen,
} from 'lucide-react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { getOrderConfiguration, getOrderErrorMessage, syncQuickBooksCatalog } from '#/api/order-management'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AnalysisConfigurationPanel } from './AnalysisConfigurationPanel'
import { AssemblyConfigurationPanel } from './AssemblyConfigurationPanel'
import { CommercialConfigurationPanel } from './CommercialConfigurationPanel'
import { ReagentConfigurationPanel } from './ReagentConfigurationPanel'
import { CatalogConfigurationPanel } from './CatalogConfigurationPanel'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SystemConfigurationPanel } from './SystemConfigurationPanel'

export type ConfigurationSection = 'system' | 'catalog' | 'lab-service-offerings' | 'shipping' | 'sample-types' | 'analyses' | 'reagents' | 'assembly' | 'commercial' | 'retention'
export function parseConfigurationSection(value: unknown): ConfigurationSection { return ['system', 'catalog', 'lab-service-offerings', 'shipping', 'sample-types', 'analyses', 'reagents', 'assembly', 'commercial', 'retention'].includes(String(value)) ? value as ConfigurationSection : 'system' }

const configurationSections: ReadonlyArray<WorkspaceSidebarItem<ConfigurationSection>> = [
  {
    value: 'system',
    label: 'Quote & workflow',
    description: 'Quote validity, sample roster, and result delivery',
    icon: Settings,
  },
  { value: 'catalog', label: 'Service catalog', description: 'Active offerings and sales units', icon: BookOpen },
  { value: 'sample-types', label: 'Sample types', description: 'Accepted materials and sample requirements', icon: TestTubeDiagonal },
  {
    value: 'analyses',
    label: 'Analyses',
    description: 'Scientific analysis definitions and pricing links',
    icon: ChartSpline,
  },
  {
    value: 'reagents',
    label: 'PSeq kits',
    description: 'Partner kit offerings and negotiated prices',
    icon: Boxes,
  },
  {
    value: 'assembly',
    label: 'Assembly',
    description: 'Included input profiles and outputs',
    icon: Workflow,
  },
  {
    value: 'commercial',
    label: 'Legacy links',
    description: 'Historical credit and connector recovery',
    icon: Landmark,
  },
]

export function OrderConfigurationPage({ catalogItemId, sampleTypeId }: { catalogItemId?: string; sampleTypeId?: string } = {}) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const sections = canManage ? configurationSections : []
  const requestedSection = sampleTypeId ? 'sample-types' : catalogItemId ? 'catalog' : parseConfigurationSection(search.configurationSection)
  const section = sections.find(item => item.value === requestedSection)?.value ?? sections[0]?.value
  const showingOrders = Boolean(section && section !== 'retention')
  const setSection = (value: ConfigurationSection) => { void navigate({ to: '/order-configuration', search: { configurationSection: value } }) }
  const apiEnabled = canManage && showingOrders && authProvider !== 'mock'
  const needsOrderConfiguration = section !== 'sample-types'
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled && needsOrderConfiguration })
  const sync = useMutation({ mutationFn: syncQuickBooksCatalog, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['order-configuration'] }) })

  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order Settings unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Order Settings"
        items={sections}
        value={section!}
        onValueChange={setSection}
      >
        <div className="page-wrap px-4 pt-6 lg:pt-0">
          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Order Settings</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Maintain quote validity, order workflows, scientific service definitions,
                Partner-negotiated reagent prices, assembly profiles, and legacy
                accounting links. Customer billing and tax approval live in Finance.
              </p>
            </div>
          </section>
          {showingOrders && authProvider === 'mock' ? (
            <Alert className="mb-5">
              <AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle>
              <AlertDescription>
                Use a real Phaeno session to load and change order configuration.
              </AlertDescription>
            </Alert>
          ) : null}
          {showingOrders && needsOrderConfiguration && configuration.error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>Configuration could not be loaded</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(configuration.error, 'Try refreshing this page.')}
              </AlertDescription>
            </Alert>
          ) : null}
          {showingOrders && needsOrderConfiguration && configuration.isLoading ? <p role="status">Loading order configuration…</p> : null}
          {section === 'commercial' ? <div className="mb-5 space-y-3 rounded-lg border p-4"><p className="text-sm text-muted-foreground">Historical accounting mappings and connector recovery. The service catalog is maintained in Service catalog.</p><Button variant="outline" disabled={!apiEnabled || sync.isPending} onClick={() => sync.mutate()}><RefreshCw data-icon="inline-start" />{sync.isPending ? 'Queueing…' : 'Queue QuickBooks catalog recovery'}</Button>{sync.error ? <p role="alert">{getOrderErrorMessage(sync.error, 'Connector recovery is unavailable.')}</p> : null}{sync.isSuccess ? <p role="status">Catalog recovery queued.</p> : null}</div> : null}
          {configuration.data && section === 'catalog' ? <CatalogConfigurationPanel configuration={configuration.data} catalogItemId={catalogItemId} apiEnabled={apiEnabled} /> : null}
          {section === 'sample-types' ? <SampleShippingConfigurationPanel apiEnabled={apiEnabled} section="sample-types" sampleTypeId={sampleTypeId} /> : null}
          {configuration.data && section === 'system' ? <SystemConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'analyses' ? <AnalysisConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'reagents' ? <ReagentConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'assembly' ? <AssemblyConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'commercial' ? <CommercialConfigurationPanel configuration={configuration.data} /> : null}
        </div>
      </WorkspaceSidebar>
    </main>
  )
}
