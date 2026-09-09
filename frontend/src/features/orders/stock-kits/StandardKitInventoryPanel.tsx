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
import { PrepareStandardKitDialog } from './StandardKitDialogs'
import { parseStockKitListSearch, stockKitStatus, type StockKitListSearch } from './stock-kit-utils'

export function StandardKitInventoryPanel({ apiEnabled, shipmentId }: { apiEnabled: boolean; shipmentId?: string }) {
  const { session } = usePhaenoSession()
  const enabled = apiEnabled && Boolean(session?.capabilities.canManageOrderConfiguration)
  const navigate = useNavigate(), client = useQueryClient()
  const search = parseStockKitListSearch(useSearch({ strict: false }))
  const [preparing, setPreparing] = useState(false)
  const query = useQuery({ queryKey: ['shipping-stock-kits'], queryFn: getShippingStockKits, enabled })
  const definitions = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled })
  if (!enabled) return null
  const needle = (search.kitSearch ?? '').trim().toLowerCase()
  const filtered = (query.data ?? []).filter(value => (!needle || `${value.kitNumber} ${value.container.commonName} ${value.container.sku} ${value.authorizationReference ?? ''}`.toLowerCase().includes(needle)) && (search.kitStatus === 'all' || value.status === search.kitStatus))
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), page = Math.min(search.kitPage ?? 1, pages)
  function change(update: StockKitListSearch) { void navigate({ to: '/lab-operations', search: { ...search, ...update, section: 'receipt', shipmentId }, replace: true, resetScroll: false }) }
  async function saved(kit: ShippingStockKit) { setPreparing(false); await client.invalidateQueries({ queryKey: ['shipping-stock-kits'] }); await navigate({ to: '/lab-operations/stock-kits/$kitId', params: { kitId: kit.id }, search: { ...search, section: 'receipt', shipmentId } }) }
  return <Card id="standard-kits"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Standard kits</CardTitle><CardDescription>Prepare configured kits, register their tubes, and record dispatch to a Customer Job.</CardDescription></div><Button disabled={!definitions.data} onClick={() => setPreparing(true)}><Plus aria-hidden="true" />Prepare standard kit</Button></div></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-40 flex-1"><Label htmlFor="stock-kit-search">Search kits</Label><Input id="stock-kit-search" className="mt-2" placeholder="Kit number, size, SKU, or Job" value={search.kitSearch ?? ''} onChange={event => change({ kitSearch: event.target.value || undefined, kitPage: 1 })} /></div><div className="min-w-40"><Label htmlFor="stock-kit-status">Status</Label><select id="stock-kit-status" className="mt-2 h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.kitStatus} onChange={event => change({ kitStatus: event.target.value as StockKitListSearch['kitStatus'], kitPage: 1 })}><option value="all">All statuses</option><option value="Preparing">Preparing</option><option value="Fulfilled">Sent to customer</option><option value="Bound">Assigned to return container</option></select></div>{needle || search.kitStatus !== 'all' ? <Button variant="ghost" onClick={() => change({ kitSearch: undefined, kitStatus: 'all', kitPage: 1 })}>Clear all</Button> : null}</div>
    {query.isLoading ? <p role="status" className="text-sm">Loading standard kits…</p> : null}
    {query.error || definitions.error ? <Alert variant="destructive"><AlertTitle>Standard kits unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error ?? definitions.error, 'Refresh the kit list and try again.')} <Button size="sm" variant="outline" onClick={() => { void query.refetch(); void definitions.refetch() }}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && filtered.length ? <div className="divide-y">{filtered.slice((page - 1) * 12, page * 12).map(kit => <div key={kit.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><Link to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.id }} search={{ ...search, section: 'receipt', shipmentId }} className="wrap-anywhere font-medium text-primary underline underline-offset-2">{kit.kitNumber}</Link><p className="mt-1 wrap-anywhere text-sm">{kit.container.commonName} · SKU {kit.container.sku}</p><p className="mt-1 text-xs text-muted-foreground">{kit.tubes.length} of {kit.container.capacity} tubes registered{kit.authorizationReference ? ` · Job ${kit.authorizationReference}` : ''}</p></div><Badge variant="outline" className="max-w-full whitespace-normal">{stockKitStatus(kit.status)}</Badge></div>)}</div> : null}
    {query.data && !filtered.length ? <p className="py-6 text-center text-sm text-muted-foreground">{query.data.length ? 'No kits match these filters.' : 'No standard kits have been prepared. Choose a configured size to prepare the first kit.'}</p> : null}
    {filtered.length ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} kits · Page {page} of {pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => change({ kitPage: page - 1 })}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => change({ kitPage: page + 1 })}>Next</Button></div></div> : null}
    {preparing ? <PrepareStandardKitDialog definitions={definitions.data ?? []} onClose={() => setPreparing(false)} onSaved={saved} /> : null}
  </CardContent></Card>
}
