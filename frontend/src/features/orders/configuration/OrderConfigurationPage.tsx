import { useQuery } from '@tanstack/react-query'
import {
  Boxes,
  ChartSpline,
  Landmark,
  PackageCheck,
  Settings,
  Tags,
  Workflow,
} from 'lucide-react'
import { useState } from 'react'

import { getOrderConfiguration, getOrderErrorMessage } from '#/api/order-management'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AnalysisConfigurationPanel } from './AnalysisConfigurationPanel'
import { AssemblyConfigurationPanel } from './AssemblyConfigurationPanel'
import { CatalogConfigurationPanel } from './CatalogConfigurationPanel'
import { CommercialConfigurationPanel } from './CommercialConfigurationPanel'
import { ReagentConfigurationPanel } from './ReagentConfigurationPanel'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SystemConfigurationPanel } from './SystemConfigurationPanel'

type ConfigurationSection = 'system' | 'catalog' | 'analyses' | 'sample-shipping' | 'reagents' | 'assembly' | 'commercial'

const configurationSections: ReadonlyArray<WorkspaceSidebarItem<ConfigurationSection>> = [
  {
    value: 'system',
    label: 'Defaults',
    description: 'Quote validity, submission, and shipping rules',
    icon: Settings,
  },
  {
    value: 'catalog',
    label: 'Catalog',
    description: 'Commercial item codes, sales units, and base prices',
    icon: Tags,
  },
  {
    value: 'analyses',
    label: 'Analyses',
    description: 'Scientific analysis definitions and pricing links',
    icon: ChartSpline,
  },
  {
    value: 'sample-shipping',
    label: 'Sample shipping',
    description: 'Destinations, sample types, and detailed packet instructions',
    icon: PackageCheck,
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
    description: 'Versioned profiles, outputs, and pricing',
    icon: Workflow,
  },
  {
    value: 'commercial',
    label: 'Credit',
    description: 'Credit decisions and release policies',
    icon: Landmark,
  },
]

export function OrderConfigurationPage() {
  const { authProvider, session } = usePhaenoSession()
  const [section, setSection] = useState<ConfigurationSection>('system')
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })

  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order configuration unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Order configuration"
        items={configurationSections}
        value={section}
        onValueChange={setSection}
      >
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            <div>
              <h1 className="text-3xl font-semibold">Order configuration</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Maintain Phaeno’s commercial catalog, link items to scientific services,
                set Partner-negotiated reagent prices, version assembly profiles, and
                control credit-dependent release behavior and sample-shipping packets.
              </p>
            </div>
          </section>
          {authProvider === 'mock' ? (
            <Alert className="mb-5">
              <AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle>
              <AlertDescription>
                Use a real Phaeno session to load and change order configuration.
              </AlertDescription>
            </Alert>
          ) : null}
          {configuration.error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>Configuration could not be loaded</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(configuration.error, 'Try refreshing this page.')}
              </AlertDescription>
            </Alert>
          ) : null}
          {configuration.isLoading ? <p role="status">Loading order configuration…</p> : null}
          {configuration.data && section === 'system' ? <SystemConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'catalog' ? <CatalogConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'analyses' ? <AnalysisConfigurationPanel configuration={configuration.data} /> : null}
          {section === 'sample-shipping' ? <SampleShippingConfigurationPanel apiEnabled={apiEnabled} /> : null}
          {configuration.data && section === 'reagents' ? <ReagentConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'assembly' ? <AssemblyConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'commercial' ? <CommercialConfigurationPanel configuration={configuration.data} /> : null}
        </div>
      </WorkspaceSidebar>
    </main>
  )
}
