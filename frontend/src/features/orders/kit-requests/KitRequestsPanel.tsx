import { useState } from 'react'
import { KitRequestListActionDialog, KitRequestRowActions, type KitRequestAction } from './KitRequestRowActions'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { getPlatformTransportationKitRequests } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { DialogReturnFocus } from '#/components/ui/dialog'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { kitRequestReference, kitRequestStatus, kitRequestStatuses, parseKitRequestSearch, type KitRequestListSearch } from './kit-request-navigation'

export function KitRequestsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const { session } = usePhaenoSession(), navigate = useNavigate()
  const currentSearch = useSearch({ strict: false }), search = parseKitRequestSearch(currentSearch)
  const enabled = apiEnabled && Boolean(session?.capabilities.canManageOrderConfiguration)
  const query = useQuery({ queryKey: ['platform-transportation-kit-requests'], queryFn: () => getPlatformTransportationKitRequests(), enabled })
  const [action, setAction] = useState<KitRequestAction | null>(null)
  if (!enabled) return null
  const needle = (search.requestSearch ?? '').trim().toLowerCase()
  const status = search.requestStatus ?? 'open'
  const requests = (query.data ?? []).filter(value => {
    const matchesStatus = status === 'all'
      || (status === 'open' && value.status !== 'Cancelled' && value.lines.some(line => line.receivedQuantity < line.requestedQuantity))
      || (status === 'sent' && value.kits.some(kit => !kit.receivedAt))
      || (status === 'received' && value.kits.some(kit => Boolean(kit.receivedAt)))
      || value.status === status
    const matchesSearch = `${value.id} ${value.jobNumber} ${value.phaseName ?? ""} ${value.organizationName} ${value.departmentName} ${value.deliveryAddress.label} ${value.lines.map(line => `${line.sku} ${line.commonName}`).join(' ')} ${value.kits.map(kit => `${kit.kitNumber} ${kit.outboundTrackingNumber}`).join(' ')}`.toLowerCase().includes(needle)
    return matchesStatus && matchesSearch
  }).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const showKits = status === 'sent' || status === 'received'
  const kits = showKits ? requests.flatMap(request => request.kits
    .filter(kit => (status === 'sent' ? !kit.receivedAt : Boolean(kit.receivedAt))
      && `${request.id} ${request.jobNumber} ${request.phaseName ?? ""} ${request.organizationName} ${request.departmentName} ${kit.kitNumber} ${kit.outboundTrackingNumber}`.toLowerCase().includes(needle))
    .map(kit => ({ request, kit })))
    .sort((a, b) => (b.kit.receivedAt ?? b.kit.dispatchedAt).localeCompare(a.kit.receivedAt ?? a.kit.dispatchedAt)) : []
  const count = showKits ? kits.length : requests.length
  const pages = Math.max(1, Math.ceil(count / 12)), page = Math.min(search.requestPage ?? 1, pages)
  function change(update: KitRequestListSearch) { void navigate({ to: '/lab-operations', search: { ...currentSearch, ...search, ...update, section: 'kit-requests', receiptTab: undefined }, replace: true, resetScroll: false }) }
  return <Card id="transportation-kit-requests" className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Kit requests</CardTitle><CardDescription>Requests stay active until the Customer confirms receipt. Use the status filter to review kits on the way or received.</CardDescription>
    <div className="col-span-full mt-3 flex flex-wrap items-end gap-3"><Field className="min-w-40 flex-1"><Label className="sr-only" htmlFor="kit-request-search">Search requests</Label><Input id="kit-request-search" placeholder="Request, Job, Customer, or kit size" value={search.requestSearch ?? ''} onChange={event => change({ requestSearch: event.target.value || undefined, requestPage: 1 })} /></Field><Field className="min-w-44"><Label className="sr-only" htmlFor="kit-request-status">Status</Label><NativeSelect id="kit-request-status" value={search.requestStatus} onChange={event => change({ requestStatus: event.target.value as KitRequestListSearch['requestStatus'], requestPage: 1 })}><option value="open">Active requests</option><option value="sent">Kits sent</option><option value="received">Kits received</option><option value="all">All requests</option>{kitRequestStatuses.map(value => <option key={value} value={value}>{value === 'Received' ? 'Fully received requests' : kitRequestStatus(value)}</option>)}</NativeSelect></Field>{needle || search.requestStatus !== 'open' ? <Button variant="ghost" onClick={() => change({ requestSearch: undefined, requestStatus: 'open', requestPage: 1 })}>Clear all</Button> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {query.isLoading ? <p role="status">Loading kit requests…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Kit requests unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh and try again.')} <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && !count ? <p className="py-5 text-sm text-muted-foreground">{query.data.length ? 'No kit requests or kits match these filters.' : 'No transportation-kit requests have been submitted.'}</p> : null}
    {showKits ? <div className="space-y-3">{kits.slice((page - 1) * 12, page * 12).map(({ request, kit }) => <article key={kit.stockKitId} className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><Link to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.stockKitId }} search={{ ...currentSearch, ...search, section: 'transportation-kits', receiptTab: 'standard-kits' }} className="font-medium text-primary underline underline-offset-2">{kit.kitNumber}</Link><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName} · Job {request.jobNumber}{request.phaseName ? ` · ${request.phaseName}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">{kit.outboundCarrier} · {kit.outboundTrackingNumber}</p></div><div className="min-w-0 text-sm"><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...currentSearch, ...search, section: 'kit-requests', receiptTab: undefined }} className="text-primary underline underline-offset-2">{kitRequestReference(request)}</Link><p className="mt-1 text-xs text-muted-foreground">Sent {new Date(kit.dispatchedAt).toLocaleString()}{kit.receivedAt ? <> · Received {new Date(kit.receivedAt).toLocaleString()}</> : null}</p></div><Badge variant="outline" className="h-fit max-w-full whitespace-normal">{kit.receivedAt ? 'Received by Customer' : 'On the way'}</Badge></article>)}</div> : <div className="space-y-3">{requests.slice((page - 1) * 12, page * 12).map(request => <article key={request.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...currentSearch, ...search, section: 'kit-requests', receiptTab: undefined }} className="font-medium text-primary underline underline-offset-2">{kitRequestReference(request)}</Link><Badge variant="outline" className="h-fit max-w-full whitespace-normal">{kitRequestStatus(request.status)}</Badge></div><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName}</p><p className="mt-1 text-xs text-muted-foreground">Job {request.jobNumber}{request.phaseName ? ` · ${request.phaseName}` : ''} · {new Date(request.requestedAt).toLocaleDateString()}</p></div><div className="col-span-full row-start-2 min-w-0 space-y-1 text-sm md:col-span-1 md:col-start-2 md:row-start-1">{request.lines.map(line => <p className="wrap-anywhere" key={line.id}>{line.commonName} · {line.receivedQuantity} of {line.requestedQuantity} received · {line.dispatchedQuantity} sent</p>)}<p className="text-xs text-muted-foreground wrap-anywhere">Deliver to {request.deliveryAddress.label}</p></div><div className="col-start-2 row-start-1 self-start md:col-start-3"><KitRequestRowActions request={request} disabled={Boolean(query.error)} onAction={setAction} /></div></article>)}</div>}
    {count ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{count} {showKits ? 'kits' : 'requests'} · Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => change({ requestPage: page - 1 })}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => change({ requestPage: page + 1 })}>Next</Button></div></div> : null}
  </CardContent>{action ? <DialogReturnFocus target={action.opener} fallbackId="kit-request-search"><KitRequestListActionDialog action={action} onClose={() => setAction(null)} /></DialogReturnFocus> : null}</Card>
}
