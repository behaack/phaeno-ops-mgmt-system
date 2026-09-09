import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Ellipsis, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { getShippingContainerDefinitions, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from './shipping-container-navigation'
import { containerEffectiveState, latestContainerRevisions } from './shipping-container-utils'

const pageSize = 12
export function ContainerSizesPanel({ apiEnabled, configuration }: { apiEnabled: boolean; configuration: SampleShippingConfiguration }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const routeSearch = useSearch({ strict: false })
  const search = useMemo(() => parseShippingContainerListSearch(routeSearch), [routeSearch])
  const [searchText, setSearchText] = useState(search.containerSearch ?? '')
  const [editing, setEditing] = useState<ShippingContainerDefinition | null | undefined>()
  const [preview, setPreview] = useState<ShippingContainerDefinition | null | undefined>()
  const query = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled: apiEnabled })
  useEffect(() => {
    if (searchText === (search.containerSearch ?? '')) return
    const timer = window.setTimeout(() => { void navigate({ to: '/order-configuration', search: { ...search, configurationSection: 'shipping', containerSearch: searchText || undefined, containerPage: 1 }, replace: true, resetScroll: false }) }, 200)
    return () => window.clearTimeout(timer)
  }, [navigate, search, searchText])
  function changeSearch(update: ShippingContainerListSearch) {
    void navigate({ to: '/order-configuration', search: { ...search, ...update, configurationSection: 'shipping' }, replace: true, resetScroll: false })
  }
  const latest = latestContainerRevisions(query.data ?? [])
  const activeByKey = new Map(latestContainerRevisions((query.data ?? []).filter(value => containerEffectiveState(value) === 'Active now')).map(value => [value.definitionKey, value]))
  const needle = (search.containerSearch ?? '').trim().toLowerCase()
  const filtered = latest.filter(item => (!needle || `${item.commonName} ${item.sku} ${item.supplierName ?? ''} ${item.supplierProductNumber ?? ''}`.toLowerCase().includes(needle))
    && (search.containerStatus === 'all' || (search.containerStatus === 'active' ? activeByKey.has(item.definitionKey) : !activeByKey.has(item.definitionKey))))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(search.containerPage ?? 1, pageCount)
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  async function saved(item: ShippingContainerDefinition) {
    setEditing(undefined)
    await client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })
    await navigate({ to: '/order-configuration/shipping-containers/$containerId', params: { containerId: item.id }, search: { ...search, configurationSection: 'shipping' } })
  }
  return <Card id="container-sizes"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Container sizes</CardTitle><CardDescription>Approved sizes, usable tube capacities, and compatible handling rules. Open a size to review its revisions.</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!apiEnabled || !query.data} onClick={() => setPreview(null)}>Preview recommendation</Button><Button disabled={!apiEnabled} onClick={() => setEditing(null)}><Plus aria-hidden="true" />Add container size</Button></div></div></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><Label htmlFor="container-search">Search container sizes</Label><Input id="container-search" className="mt-2" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Common name or SKU" /></div><div><Label htmlFor="container-status">Status</Label><select id="container-status" className="mt-2 h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.containerStatus} onChange={event => changeSearch({ containerStatus: event.target.value as ShippingContainerListSearch['containerStatus'], containerPage: 1 })}><option value="all">All statuses</option><option value="active">Active now</option><option value="inactive">Inactive, scheduled, or ended</option></select></div>{needle || search.containerStatus !== 'all' ? <Button variant="ghost" onClick={() => { setSearchText(''); changeSearch({ containerSearch: undefined, containerStatus: 'all', containerPage: 1 }) }}>Clear all</Button> : null}</div>
    {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading container sizes…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Container sizes unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh the list and try again.')} <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && items.length ? <table className="w-full table-fixed text-left text-sm">
      <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 pr-3 font-medium">Container</th><th className="w-16 pb-2 pr-2 font-medium sm:w-24">Usable tubes</th><th className="w-24 pb-2 font-medium">Status</th><th className="w-10 pb-2"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody className="divide-y">{items.map(item => <tr key={item.id}>
        <td className="py-3 pr-3"><Link className="wrap-anywhere font-medium text-primary underline underline-offset-2" to="/order-configuration/shipping-containers/$containerId" params={{ containerId: item.id }} search={{ ...search, configurationSection: 'shipping' }}>{item.commonName}</Link><p className="mt-1 wrap-anywhere text-xs text-muted-foreground">SKU {item.sku} · revision {item.revision}</p></td>
        <td className="py-3 pr-2">{item.tubeCapacity}</td><td className="py-3"><Badge variant="outline">{containerEffectiveState(item)}</Badge>{activeByKey.has(item.definitionKey) && activeByKey.get(item.definitionKey)!.id !== item.id ? <p className="mt-1 text-xs text-muted-foreground">Revision {activeByKey.get(item.definitionKey)!.revision} active</p> : null}</td>
        <td className="py-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.commonName}`}><Ellipsis aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setEditing(item)}>Create revision</DropdownMenuItem><DropdownMenuItem onSelect={() => setPreview(item)}>Preview recommendation</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
      </tr>)}</tbody>
    </table> : null}
    {query.data && !items.length ? <p className="py-6 text-center text-sm text-muted-foreground">{latest.length ? 'No container sizes match these filters.' : 'No container sizes are configured. Add the approved sizes and capacities used by Phaeno.'}</p> : null}
    {query.data && filtered.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} sizes · Page {page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changeSearch({ containerPage: page - 1 })}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => changeSearch({ containerPage: page + 1 })}>Next</Button></div></div> : null}
    {editing !== undefined ? <ShippingContainerEditor source={editing} configuration={configuration} onClose={() => setEditing(undefined)} onSaved={saved} /> : null}
    {preview !== undefined ? <ContainerRecommendationDialog definitions={query.data ?? []} configuration={configuration} draftDefinition={preview ?? undefined} onClose={() => setPreview(undefined)} /> : null}
  </CardContent></Card>
}
