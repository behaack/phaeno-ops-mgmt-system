import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  ChartSpline,
  Landmark,
  RefreshCw,
  Settings,
  Workflow,
} from 'lucide-react'
import { useState } from 'react'

import { getOrderConfiguration, getOrderErrorMessage, syncQuickBooksCatalog } from '#/api/order-management'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AnalysisConfigurationPanel } from './AnalysisConfigurationPanel'
import { AssemblyConfigurationPanel } from './AssemblyConfigurationPanel'
import { CommercialConfigurationPanel } from './CommercialConfigurationPanel'
import { ReagentConfigurationPanel } from './ReagentConfigurationPanel'
import { SystemConfigurationPanel } from './SystemConfigurationPanel'

type ConfigurationSection = 'system' | 'analyses' | 'reagents' | 'assembly' | 'commercial'

const configurationSections: ReadonlyArray<WorkspaceSidebarItem<ConfigurationSection>> = [
  {
    value: 'system',
    label: 'Defaults',
    description: 'Quote validity, submission, and shipping rules',
    icon: Settings,
  },
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
    description: 'Versioned profiles, outputs, and pricing',
    icon: Workflow,
  },
  {
    value: 'commercial',
    label: 'Credit & QBO',
    description: 'Credit decisions and QuickBooks mappings',
    icon: Landmark,
  },
]

export function OrderConfigurationPage() {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [section, setSection] = useState<ConfigurationSection>('system')
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  const sync = useMutation({ mutationFn: syncQuickBooksCatalog, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['order-configuration'] }) })

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
          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Order configuration</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Link QuickBooks items to scientific services, maintain Partner-negotiated
                reagent prices, version assembly profiles, and control credit-dependent
                release behavior.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!apiEnabled || sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCw data-icon="inline-start" />
              {sync.isPending ? 'Queueing sync…' : 'Sync QuickBooks catalog'}
            </Button>
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
          {configuration.data && section === 'analyses' ? <AnalysisConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'reagents' ? <ReagentConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'assembly' ? <AssemblyConfigurationPanel configuration={configuration.data} /> : null}
          {configuration.data && section === 'commercial' ? <CommercialConfigurationPanel configuration={configuration.data} /> : null}
        </div>
      </WorkspaceSidebar>
    </main>
  )
}
