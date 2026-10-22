import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { RecordLink } from '#/components/ui/record-link'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getShippingContainerDefinitions, getShippingStockKits, type ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { AssembleTransportationKitDialog } from './AssembleTransportationKitDialog'
import { parseStockKitListSearch, stockKitMatchesStatusFilter, stockKitState, stockKitStates, stockKitStatus, type StockKitListSearch } from './stock-kit-utils'

export function StandardKitInventoryPanel({ apiEnabled, shipmentId }: { apiEnabled: boolean; shipmentId?: string }) {
  const __customerSource = useCustomerSourceText()

  const { session } = usePhaenoSession()
  const enabled = apiEnabled && Boolean(session?.capabilities.canManageOrderConfiguration)
  const navigate = useNavigate(), client = useQueryClient()
  const currentSearch = useSearch({ strict: false })
  const search = parseStockKitListSearch(currentSearch)
  const [mode, setMode] = useState<'prepare' | null>(null)
  const [resumeKit, setResumeKit] = useState<ShippingStockKit | null>(null)
  const query = useQuery({ queryKey: ['shipping-stock-kits'], queryFn: getShippingStockKits, enabled })
  const definitions = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled })
  if (!enabled) return null
  const needle = (search.kitSearch ?? '').trim().toLowerCase()
  const inProgress = (query.data ?? []).filter(value => !value.assemblyCompletedAt && !value.withdrawnAt && value.status === 'Preparing')
  const filtered = (query.data ?? []).filter(value => value.assemblyCompletedAt && (!needle || `${value.kitNumber} ${value.container.commonName} ${value.container.sku} ${value.deliveryLocationLabel ?? ''} ${value.originatingJobNumber ?? value.authorizationReference ?? ''} ${value.assignedJobNumber ?? ''}`.toLowerCase().includes(needle)) && stockKitMatchesStatusFilter(value, search.kitStatus))
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), page = Math.min(search.kitPage ?? 1, pages)
  function change(update: StockKitListSearch) { void navigate({ to: '/lab-operations', search: { ...currentSearch, ...search, ...update, section: 'transportation-kits', receiptTab: 'standard-kits', shipmentId }, replace: true, resetScroll: false }) }
  async function saved() { setMode(null); setResumeKit(null); await client.invalidateQueries({ queryKey: ['shipping-stock-kits'] }) }
  return <div className="space-y-4">
    {inProgress.length ? <Card className="gap-0 py-0"><CardHeader ><CardTitle><CustomerSourceText source={"In progress"} /></CardTitle><CardDescription><CustomerSourceText source={"Saved assemblies are outside Inventory and cannot be dispatched."} /></CardDescription></CardHeader><CardContent className="max-h-96 overflow-y-auto p-4"><ul className="divide-y">{inProgress.map(kit => <li key={kit.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><RecordLink asChild><Link to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.id }} search={{ ...currentSearch, ...search, section: 'transportation-kits', receiptTab: 'standard-kits', shipmentId }} >{kit.container.commonName}</Link></RecordLink><p className="wrap-anywhere font-mono text-xs text-muted-foreground">{kit.kitNumber}</p><p className="text-xs text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} <CustomerSourceText source={"tubes registered"} /></p></div><Button variant="outline" onClick={() => setResumeKit(kit)}><CustomerSourceText source={"Resume assembly"} /></Button></li>)}</ul></CardContent></Card> : null}
    <Card id="standard-kits" className="gap-0 py-0"><CardHeader ><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle><CustomerSourceText source={"Inventory"} /></CardTitle><CardDescription><CustomerSourceText source={"Completed kits, their dispatch and Customer use."} /></CardDescription></div><Button disabled={!definitions.data || Boolean(definitions.error)} onClick={() => setMode('prepare')}><Plus aria-hidden="true" /><CustomerSourceText source={"Assemble transportation kit"} /></Button></div>
    <div className="col-span-full mt-3 flex flex-wrap items-end gap-3"><PortalField className="min-w-40 flex-1"><Label htmlFor="stock-kit-search"><CustomerSourceText source={"Search kits"} /></Label><Input id="stock-kit-search"  placeholder={__customerSource("Barcode, kit product, SKU, location or Job")} value={search.kitSearch ?? ''} onChange={event => change({ kitSearch: event.target.value || undefined, kitPage: 1 })} /></PortalField><PortalField className="min-w-40"><Label htmlFor="stock-kit-status"><CustomerSourceText source={"Status"} /></Label><NativeSelect id="stock-kit-status" className="w-full" value={search.kitStatus} onChange={event => change({ kitStatus: event.target.value as StockKitListSearch['kitStatus'], kitPage: 1 })}><option value="inventory"><CustomerSourceText source={"At Phaeno"} /></option><option value="shipped"><CustomerSourceText source={"Shipped kits"} /></option><option value="all"><CustomerSourceText source={"All statuses"} /></option>{stockKitStates.filter(state => state !== 'Preparing').map(state => <option key={state} value={state}>{stockKitStatus(state)}</option>)}</NativeSelect></PortalField>{needle || search.kitStatus !== 'inventory' ? <ClearFiltersButton  onClick={() => change({ kitSearch: undefined, kitStatus: 'inventory', kitPage: 1 })}></ClearFiltersButton> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {query.isLoading ? <p role="status" className="text-sm"><CustomerSourceText source={"Loading standard kits…"} /></p> : null}
    {query.error || definitions.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Standard kits unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error ?? definitions.error, 'Refresh the kit list and try again.')} />} <Button size="sm" variant="outline" onClick={() => { void query.refetch(); void definitions.refetch() }}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : null}
    {query.data && filtered.length ? <div className="space-y-3">{filtered.slice((page - 1) * 12, page * 12).map(kit => <article key={kit.id} className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><span className="wrap-anywhere"><RecordLink asChild><Link to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.id }} search={{ ...currentSearch, ...search, section: 'transportation-kits', receiptTab: 'standard-kits', shipmentId }} >{kit.kitNumber}</Link></RecordLink></span><p className="mt-1 wrap-anywhere text-sm">{kit.container.commonName} <CustomerSourceText source={"· SKU"} /> {kit.container.sku}</p><p className="mt-1 text-xs text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} <CustomerSourceText source={"tubes registered"} /></p></div><div className="min-w-0 space-y-1 text-sm"><p className="wrap-anywhere">{kit.status === 'Preparing' ? <CustomerSourceText source={"At Phaeno"} /> : kit.deliveryLocationLabel || 'Location not recorded'}</p>{kit.assignedJobNumber ? <p className="wrap-anywhere"><CustomerSourceText source={"Assigned to"} /> {kit.assignedJobNumber}</p> : null}{kit.originatingJobNumber || kit.authorizationReference ? <p className="wrap-anywhere text-xs text-muted-foreground"><CustomerSourceText source={"Originating Job"} /> {kit.originatingJobNumber ?? kit.authorizationReference}</p> : null}</div><Badge variant="outline" className="h-fit max-w-full whitespace-normal">{stockKitStatus(stockKitState(kit))}</Badge></article>)}</div> : null}
    {query.data && !filtered.length ? <p className="py-6 text-center text-sm text-muted-foreground">{!query.data.length ? <CustomerSourceText source={"No completed kits are in Inventory. Assemble a transportation kit to add one."} /> : !needle && search.kitStatus === 'inventory' ? 'No completed kits are ready at Phaeno. Resume a saved assembly or assemble a new kit.' : 'No kits match these filters.'}</p> : null}
    {filtered.length ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} <CustomerSourceText source={"kits · Page"} /> {page} of {pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => change({ kitPage: page - 1 })}><CustomerSourceText source={"Previous"} /></Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => change({ kitPage: page + 1 })}><CustomerSourceText source={"Next"} /></Button></div></div> : null}
  </CardContent></Card>
    {mode || resumeKit ? <AssembleTransportationKitDialog definitions={definitions.data ?? []} initialKit={resumeKit ?? undefined} onClose={() => { setMode(null); setResumeKit(null) }} onSaved={saved} /> : null}
  </div>
}
