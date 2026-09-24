import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getPlatformSampleShipments } from '#/api/sample-shipping'
import { getShippingStockKit, type ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { usePhaenoSession } from '#/features/auth/session-context'
import { CorrectStockKitTubeDialog, DispatchStandardKitDialog, RegisterStockKitTubesDialog, VerifyStockKitTubesDialog } from './StandardKitDialogs'
import { parseStockKitListSearch, stockKitState, stockKitStatus } from './stock-kit-utils'
import { StockKitRequestRecovery } from './StockKitRequestRecovery'
import { refreshStockKitSupply } from './stock-kit-request-sync'
import { CustomerStockKitDispatchDialog } from './CustomerStockKitDispatchDialog'
import { StockKitBarcodeDialog } from './StockKitBarcodeDialog'
import { StockKitFacts } from './StockKitFacts'
import { KitAssemblyRunPanel } from './KitAssemblyRunPanel'

export function StandardKitDetailPage({ kitId }: { kitId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration), enabled = canManage && authProvider !== 'mock'
  const rawSearch = useSearch({ strict: false }), client = useQueryClient()
  const search = { ...rawSearch, ...parseStockKitListSearch(rawSearch), section: 'transportation-kits' as const, receiptTab: 'standard-kits' as const, shipmentId: 'shipmentId' in rawSearch ? rawSearch.shipmentId : undefined }
  const [action, setAction] = useState<{ kind: 'register' | 'verify' | 'correct' | 'dispatch' | 'legacy-dispatch' | 'barcode'; kit: ShippingStockKit } | null>(null)
  const query = useQuery({ queryKey: ['shipping-stock-kit', kitId], queryFn: () => getShippingStockKit(kitId), enabled })
  const shipments = useQuery({ queryKey: ['sample-shipping-workflow'], queryFn: getPlatformSampleShipments, enabled: enabled && action?.kind === 'legacy-dispatch' })
  async function saved() { setAction(null); await refreshStockKitSupply(client) }
  const back = rawSearch.returnKitRequestId ? <Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: rawSearch.returnKitRequestId }} search={{ ...rawSearch, section: 'transportation-kits', receiptTab: 'kit-requests', returnKitRequestId: undefined }} className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"><ArrowLeft className="size-4" aria-hidden="true" />Back to kit request</Link> : <Link to="/lab-operations" search={search} hash="standard-kits" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"><ArrowLeft className="size-4" aria-hidden="true" />Back to transportation kits</Link>
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Standard kits unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert></main>
  if (!enabled) return <main className="page-wrap px-4 py-8"><p>Use a connected Phaeno session to review standard kits.</p></main>
  if (!query.data) return <main className="page-wrap space-y-5 px-4 py-8">{back}{query.isLoading ? <p role="status">Loading standard kit…</p> : <Alert variant="destructive"><AlertTitle>Standard kit unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'The requested kit could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert>}</main>
  const kit = query.data, preparing = kit.status === 'Preparing', full = kit.tubes.length === kit.container.capacity, assemblyReady = !kit.finishedKitProductId || Boolean(kit.assemblyCompletedAt)
  const availableActions: { kind: NonNullable<typeof action>['kind']; label: string }[] = []
  if (preparing && !full && !kit.tubesVerifiedAt) availableActions.push({ kind: 'register', label: 'Register tubes' })
  if (preparing && kit.tubes.length) availableActions.push({ kind: 'correct', label: 'Correct tube ID' })
  if (preparing && full && !kit.tubesVerifiedAt) availableActions.push({ kind: 'verify', label: 'Verify physical tube roster' })
  if (preparing && full && kit.tubesVerifiedAt && assemblyReady) {
    availableActions.push({ kind: 'dispatch', label: 'Record Customer dispatch' })
    availableActions.push({ kind: 'legacy-dispatch', label: 'Record Trial or Partner dispatch' })
  }
  availableActions.push({ kind: 'barcode', label: 'Print container barcode' })
  return <main className="page-wrap px-4 py-8">{back}<header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="wrap-anywhere text-2xl font-semibold">{kit.kitNumber}</h1><p className="mt-2 wrap-anywhere text-sm text-muted-foreground">{kit.container.commonName} · SKU {kit.container.sku} · {kit.container.capacity} tube capacity</p><Badge variant="outline" className="mt-2">{stockKitStatus(stockKitState(kit))}</Badge></div>{availableActions.length === 1 ? <Button type="button" variant="outline" disabled={Boolean(query.error)} onClick={() => setAction({ kind: availableActions[0].kind, kit })}>{availableActions[0].label}</Button> : <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">{availableActions.map(item => <DropdownMenuItem key={item.kind} disabled={Boolean(query.error) && item.kind !== 'barcode'} onSelect={() => setAction({ kind: item.kind, kit })}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}</header>
    {query.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Kit refresh failed</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh before making further changes.')}</AlertDescription></Alert> : null}
    {!query.error && kit.fulfilledAt && !kit.transportationKitRequestId && (kit.originatingJobId || kit.authorizationSourceId) && !kit.boundSampleShipmentId && !kit.reservedSampleShipmentId ? <StockKitRequestRecovery kit={kit} onSaved={saved} /> : null}
    {stockKitState(kit) === 'NeedsReview' ? <Alert className="mb-5"><AlertTitle>Inventory needs review</AlertTitle><AlertDescription>{kit.inventoryBlockedReason || 'This kit is not available for Customer preparation. Review its delivery location, receipt and fulfillment history before using it.'}</AlertDescription></Alert> : null}
    <StockKitFacts kit={kit} />
    {kit.finishedKitProductId ? <KitAssemblyRunPanel kit={kit} onSaved={saved} /> : null}
    {action?.kind === 'register' ? <RegisterStockKitTubesDialog kit={action.kit} onClose={() => setAction(null)} onSaved={saved} /> : null}
    {action?.kind === 'verify' ? <VerifyStockKitTubesDialog kit={action.kit} onClose={() => setAction(null)} onSaved={saved} /> : null}
    {action?.kind === 'correct' ? <CorrectStockKitTubeDialog kit={action.kit} onClose={() => setAction(null)} onSaved={saved} /> : null}
    {action?.kind === 'dispatch' ? <CustomerStockKitDispatchDialog kit={action.kit} onClose={() => setAction(null)} onSaved={saved} /> : null}
    {action?.kind === 'barcode' ? <StockKitBarcodeDialog kit={action.kit} onClose={() => setAction(null)} /> : null}
    {action?.kind === 'legacy-dispatch' && !shipments.data ? <Alert className="mt-5" variant={shipments.error ? 'destructive' : 'default'}><AlertTitle>{shipments.error ? 'Trial and Partner shipments unavailable' : 'Loading Trial and Partner shipments…'}</AlertTitle><AlertDescription>{shipments.error ? getOrderErrorMessage(shipments.error, 'Refresh and try again.') : 'Checking the existing supply workflow.'}<Button className="ml-2" size="sm" variant="outline" onClick={() => setAction(null)}>Cancel</Button>{shipments.error ? <Button className="ml-2" size="sm" variant="outline" onClick={() => void shipments.refetch()}>Retry</Button> : null}</AlertDescription></Alert> : null}
    {action?.kind === 'legacy-dispatch' && shipments.data ? <DispatchStandardKitDialog kit={action.kit} shipments={shipments.data} initialShipmentId={search.shipmentId} onClose={() => setAction(null)} onSaved={saved} /> : null}
  </main>
}
