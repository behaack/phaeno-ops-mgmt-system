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
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'
import { containerDateTime } from '../configuration/shipping-container-utils'
import { DispatchStandardKitDialog, RegisterStockKitTubesDialog } from './StandardKitDialogs'
import { parseStockKitListSearch, stockKitStatus } from './stock-kit-utils'
import { StockKitRequestRecovery } from './StockKitRequestRecovery'
import { refreshStockKitSupply } from './stock-kit-request-sync'

export function StandardKitDetailPage({ kitId }: { kitId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration), enabled = canManage && authProvider !== 'mock'
  const rawSearch = useSearch({ strict: false }), client = useQueryClient()
  const search = { ...parseStockKitListSearch(rawSearch), section: 'receipt' as const, shipmentId: 'shipmentId' in rawSearch ? rawSearch.shipmentId : undefined }
  const [action, setAction] = useState<{ kind: 'register' | 'dispatch'; kit: ShippingStockKit } | null>(null)
  const query = useQuery({ queryKey: ['shipping-stock-kit', kitId], queryFn: () => getShippingStockKit(kitId), enabled })
  const shipments = useQuery({ queryKey: ['sample-shipping-workflow'], queryFn: getPlatformSampleShipments, enabled: enabled && action?.kind === 'dispatch' })
  async function saved() { setAction(null); await refreshStockKitSupply(client) }
  const back = <Link to="/lab-operations" search={search} hash="standard-kits" className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"><ArrowLeft className="size-4" aria-hidden="true" />Back to standard kits</Link>
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Standard kits unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert></main>
  if (!enabled) return <main className="page-wrap px-4 py-8"><p>Use a connected Phaeno session to review standard kits.</p></main>
  if (!query.data) return <main className="page-wrap space-y-5 px-4 py-8">{back}{query.isLoading ? <p role="status">Loading standard kit…</p> : <Alert variant="destructive"><AlertTitle>Standard kit unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'The requested kit could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert>}</main>
  const kit = query.data, preparing = kit.status === 'Preparing', full = kit.tubes.length === kit.container.capacity
  return <main className="page-wrap px-4 py-8">{back}<header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h1 className="wrap-anywhere text-2xl font-semibold">{kit.kitNumber}</h1><p className="mt-2 wrap-anywhere text-sm text-muted-foreground">{kit.container.commonName} · SKU {kit.container.sku} · {kit.container.capacity} tube capacity</p><Badge variant="outline" className="mt-2">{stockKitStatus(kit.status)}</Badge></div>{preparing ? <div className="flex flex-wrap gap-2">{!full ? <Button onClick={() => setAction({ kind: 'register', kit })}>Register tubes</Button> : <Button onClick={() => setAction({ kind: 'dispatch', kit })}>Record dispatch</Button>}</div> : null}</header>
    {query.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Kit refresh failed</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh before making further changes.')}</AlertDescription></Alert> : null}
    {!query.error && kit.status === 'Fulfilled' && kit.authorizationSourceId && !kit.boundSampleShipmentId ? <StockKitRequestRecovery kit={kit} onSaved={saved} /> : null}
    <div className="grid items-start gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Kit details</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm"><Fact label="Tube supplier" value={kit.tubeSupplierName} /><Fact label="Tube product" value={kit.tubeProductNumber} /><Fact label="Tube lot" value={kit.tubeLotNumber || 'Not specified'} /><Fact label="Shipper supplier" value={kit.shipperSupplierName} /><Fact label="Shipper product" value={kit.shipperProductNumber} /><Fact label="Customer Job" value={kit.authorizationReference || 'Not assigned'} /><Fact label="Carrier" value={kit.outboundCarrier || 'Not dispatched'} /><Fact label="Tracking number" value={kit.outboundTrackingNumber || 'Not dispatched'} /><Fact label="Dispatched at" value={kit.fulfilledAt ? containerDateTime(kit.fulfilledAt) : 'Not dispatched'} /></dl></CardContent></Card><Card><CardHeader><CardTitle>Registered tubes</CardTitle><p className="text-sm text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} tubes registered</p></CardHeader><CardContent>{kit.tubes.length ? <RegisteredTubeList tubes={kit.tubes} /> : <p className="text-sm text-muted-foreground">Register the permanent supplier barcode on each physical tube.</p>}{preparing ? <p className="mt-3 text-sm text-muted-foreground">{full ? 'The kit is ready to send to a Customer Job.' : 'Register the full configured tube capacity before recording dispatch.'}</p> : <p className="mt-3 text-sm text-muted-foreground">The registered tube membership is frozen after dispatch.</p>}</CardContent></Card></div>
    {action?.kind === 'register' ? <RegisterStockKitTubesDialog kit={action.kit} onClose={() => setAction(null)} onSaved={saved} /> : null}
    {action?.kind === 'dispatch' && !shipments.data ? <Alert className="mt-5" variant={shipments.error ? 'destructive' : 'default'}><AlertTitle>{shipments.error ? 'Customer Jobs unavailable' : 'Loading Customer Jobs…'}</AlertTitle><AlertDescription>{shipments.error ? getOrderErrorMessage(shipments.error, 'Refresh and try again.') : 'Loading the Jobs available for kit dispatch.'}<Button className="ml-2" size="sm" variant="outline" onClick={() => setAction(null)}>Cancel</Button>{shipments.error ? <Button className="ml-2" size="sm" variant="outline" onClick={() => void shipments.refetch()}>Retry</Button> : null}</AlertDescription></Alert> : null}
    {action?.kind === 'dispatch' && shipments.data ? <DispatchStandardKitDialog kit={action.kit} shipments={shipments.data} initialShipmentId={search.shipmentId} onClose={() => setAction(null)} onSaved={saved} /> : null}
  </main>
}
function Fact({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div> }

function RegisteredTubeList({ tubes }: { tubes: Array<{ id: string; supplierBarcode: string }> }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The bounded barcode list must remain keyboard-scrollable after dispatch, when it has no row actions.
    <div role="region" tabIndex={0} aria-label="Registered tube barcodes" className="max-h-96 overflow-y-auto overscroll-contain rounded-md border px-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <ul className="divide-y">{tubes.map(tube => <li key={tube.id} className="wrap-anywhere py-2 font-mono text-sm">{tube.supplierBarcode}</li>)}</ul>
    </div>
  )
}
