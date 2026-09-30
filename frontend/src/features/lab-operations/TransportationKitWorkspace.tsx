import { StandardKitInventoryPanel } from '#/features/orders/stock-kits/StandardKitInventoryPanel'

export function TransportationKitWorkspace({ apiEnabled, shipmentId }: {
  apiEnabled: boolean
  shipmentId?: string
}) {
  return <div className="space-y-5">
    <div><h2 className="text-lg font-semibold">Transportation kit inventory</h2><p className="text-sm text-muted-foreground">Assemble and track individual physical kits and their preparation history.</p></div>
    <StandardKitInventoryPanel apiEnabled={apiEnabled} shipmentId={shipmentId} />
  </div>
}
