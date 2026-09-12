import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { getPlatformTransportationKitRequests } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { kitRequestReference, kitRequestStatus, kitRequestStatuses, parseKitRequestSearch, type KitRequestListSearch } from './kit-request-navigation'

export function KitRequestsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const { session } = usePhaenoSession(), navigate = useNavigate()
  const currentSearch = useSearch({ strict: false }), search = parseKitRequestSearch(currentSearch)
  const enabled = apiEnabled && Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useQuery({ queryKey: ['platform-transportation-kit-requests'], queryFn: () => getPlatformTransportationKitRequests(), enabled })
  if (!enabled) return null
  const needle = (search.requestSearch ?? '').trim().toLowerCase()
  const requests = (query.data ?? []).filter(value => (search.requestStatus === 'all' || (search.requestStatus === 'open' ? ['Pending', 'PartiallyDispatched'].includes(value.status) : value.status === search.requestStatus)) && `${value.id} ${value.jobNumber} ${value.organizationName} ${value.departmentName} ${value.deliveryAddress.label} ${value.lines.map(line => `${line.sku} ${line.commonName}`).join(' ')}`.toLowerCase().includes(needle)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const pages = Math.max(1, Math.ceil(requests.length / 12)), page = Math.min(search.requestPage ?? 1, pages)
  function change(update: KitRequestListSearch) { void navigate({ to: '/lab-operations', search: { ...currentSearch, ...search, ...update, section: 'receipt', receiptTab: 'kit-requests' }, replace: true, resetScroll: false }) }
  return <Card id="transportation-kit-requests" className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Kit requests</CardTitle><CardDescription>Prepare and send transportation kits requested by Customers. Kits and outbound shipping are included in the Lab order.</CardDescription>
    <div className="col-span-full mt-3 flex flex-wrap items-end gap-3"><div className="min-w-40 flex-1"><Label htmlFor="kit-request-search">Search requests</Label><Input id="kit-request-search" className="mt-2" placeholder="Request, Job, Customer, or kit size" value={search.requestSearch ?? ''} onChange={event => change({ requestSearch: event.target.value || undefined, requestPage: 1 })} /></div><div className="min-w-44"><Label htmlFor="kit-request-status">Request status</Label><select id="kit-request-status" className="mt-2 h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.requestStatus} onChange={event => change({ requestStatus: event.target.value as KitRequestListSearch['requestStatus'], requestPage: 1 })}><option value="open">Awaiting dispatch</option><option value="all">All statuses</option>{kitRequestStatuses.map(value => <option key={value} value={value}>{kitRequestStatus(value)}</option>)}</select></div>{needle || search.requestStatus !== 'open' ? <Button variant="ghost" onClick={() => change({ requestSearch: undefined, requestStatus: 'open', requestPage: 1 })}>Clear all</Button> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {query.isLoading ? <p role="status">Loading kit requests…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Kit requests unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh and try again.')} <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && !requests.length ? <p className="py-5 text-sm text-muted-foreground">{query.data.length ? 'No kit requests match these filters.' : 'No transportation-kit requests have been submitted.'}</p> : null}
    <div className="space-y-3">{requests.slice((page - 1) * 12, page * 12).map(request => <article key={request.id} className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...currentSearch, ...search, section: 'receipt', receiptTab: 'kit-requests' }} className="font-medium text-primary underline underline-offset-2">{kitRequestReference(request)}</Link><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName}</p><p className="mt-1 text-xs text-muted-foreground">Job {request.jobNumber} · {new Date(request.requestedAt).toLocaleDateString()}</p></div><div className="min-w-0 space-y-1 text-sm">{request.lines.map(line => <p className="wrap-anywhere" key={line.id}>{line.commonName} · {line.dispatchedQuantity} of {line.requestedQuantity} sent</p>)}<p className="text-xs text-muted-foreground wrap-anywhere">Deliver to {request.deliveryAddress.label}</p></div><Badge variant="outline" className="h-fit max-w-full whitespace-normal">{kitRequestStatus(request.status)}</Badge></article>)}</div>
    {requests.length ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{requests.length} requests · Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => change({ requestPage: page - 1 })}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => change({ requestPage: page + 1 })}>Next</Button></div></div> : null}
  </CardContent></Card>
}
