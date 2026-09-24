import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { KitRequestsPanel } from '#/features/orders/kit-requests/KitRequestsPanel'
import { StandardKitInventoryPanel } from '#/features/orders/stock-kits/StandardKitInventoryPanel'
import { ReturnKitFulfillmentPanel } from '#/features/orders/ReturnKitFulfillmentPanel'
import { resolveTransportationKitTab, type LabReceiptTab } from './lab-receipt-tabs'

export function TransportationKitWorkspace({ apiEnabled, canManageKitSupply, shipmentId, tab, onTabChange }: {
  apiEnabled: boolean
  canManageKitSupply: boolean
  shipmentId?: string
  tab?: LabReceiptTab
  onTabChange?: (tab: LabReceiptTab) => void
}) {
  const selected = resolveTransportationKitTab(tab, canManageKitSupply)
  return <div className="space-y-5">
    <div><h2 className="text-lg font-semibold">Transportation kits</h2><p className="text-sm text-muted-foreground">Prepare and track individual physical kits, fulfill requests, and review kits sent.</p></div>
    <Tabs value={selected} onValueChange={value => onTabChange?.(value as LabReceiptTab)} className="gap-4">
      <div className="min-w-0 overflow-x-auto pb-1"><TabsList aria-label="Transportation kit tasks" className="w-max min-w-full">
        <TabsTrigger value="standard-kits">Inventory</TabsTrigger>
        {canManageKitSupply ? <TabsTrigger value="kit-requests">Kit requests</TabsTrigger> : null}
        <TabsTrigger value="return-kits">Kits sent</TabsTrigger>
      </TabsList></div>
      <TabsContent value="standard-kits"><StandardKitInventoryPanel apiEnabled={apiEnabled} shipmentId={shipmentId} /></TabsContent>
      {canManageKitSupply ? <TabsContent value="kit-requests"><KitRequestsPanel apiEnabled={apiEnabled} /></TabsContent> : null}
      <TabsContent value="return-kits"><ReturnKitFulfillmentPanel apiEnabled={apiEnabled} shipmentId={shipmentId} showEmpty /></TabsContent>
    </Tabs>
  </div>
}
