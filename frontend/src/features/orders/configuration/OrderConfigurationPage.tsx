import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { getOrderConfiguration, getOrderErrorMessage, syncQuickBooksCatalog } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AnalysisConfigurationPanel } from './AnalysisConfigurationPanel'
import { AssemblyConfigurationPanel } from './AssemblyConfigurationPanel'
import { CommercialConfigurationPanel } from './CommercialConfigurationPanel'
import { ReagentConfigurationPanel } from './ReagentConfigurationPanel'
import { SystemConfigurationPanel } from './SystemConfigurationPanel'

export function OrderConfigurationPage() {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'
  const configuration = useQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, enabled: apiEnabled })
  const sync = useMutation({ mutationFn: syncQuickBooksCatalog, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['order-configuration'] }) })

  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Order configuration unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8"><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Order configuration</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Link QuickBooks items to scientific services, maintain Partner-negotiated reagent prices, version assembly profiles, and control credit-dependent release behavior.</p></div><Button type="button" variant="outline" disabled={!apiEnabled || sync.isPending} onClick={() => sync.mutate()}><RefreshCw data-icon="inline-start" />{sync.isPending ? 'Queueing sync…' : 'Sync QuickBooks catalog'}</Button></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle><AlertDescription>Use a real Phaeno session to load and change order configuration.</AlertDescription></Alert> : null}
    {configuration.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Try refreshing this page.')}</AlertDescription></Alert> : null}
    {configuration.isLoading ? <p role="status">Loading order configuration…</p> : null}
    {configuration.data ? <Tabs defaultValue="system"><TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"><TabsTrigger value="system">Defaults</TabsTrigger><TabsTrigger value="analyses">Analyses</TabsTrigger><TabsTrigger value="reagents">Reagents</TabsTrigger><TabsTrigger value="assembly">Assembly</TabsTrigger><TabsTrigger value="commercial">Credit & QBO</TabsTrigger></TabsList><TabsContent value="system"><SystemConfigurationPanel configuration={configuration.data} /></TabsContent><TabsContent value="analyses"><AnalysisConfigurationPanel configuration={configuration.data} /></TabsContent><TabsContent value="reagents"><ReagentConfigurationPanel configuration={configuration.data} /></TabsContent><TabsContent value="assembly"><AssemblyConfigurationPanel configuration={configuration.data} /></TabsContent><TabsContent value="commercial"><CommercialConfigurationPanel configuration={configuration.data} /></TabsContent></Tabs> : null}
  </main>
}
