import { LoadingState } from '#/components/ui/content-state'
import { DisplayTimestamp, DisplayDate } from '#/components/ui/display-value'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { orderStatusTones } from '#/features/orders/OrderStatusBadge'
import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { RecordLink } from '#/components/ui/record-link'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
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
  const __customerSource = useCustomerSourceText()

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
  return <Card id="transportation-kit-requests" className="gap-0 py-0"><CardHeader ><CardTitle><CustomerSourceText source={"Kit requests"} /></CardTitle><CardDescription><CustomerSourceText source={"Requests stay active until the Customer confirms receipt. Use the status filter to review kits on the way or received."} /></CardDescription>
    <div className="col-span-full mt-3 flex flex-wrap items-end gap-3"><Field className="min-w-40 flex-1"><Label className="sr-only" htmlFor="kit-request-search"><CustomerSourceText source={"Search requests"} /></Label><Input id="kit-request-search" placeholder={__customerSource("Request, Job, Customer, or kit size")} value={search.requestSearch ?? ''} onChange={event => change({ requestSearch: event.target.value || undefined, requestPage: 1 })} /></Field><Field className="min-w-44"><Label className="sr-only" htmlFor="kit-request-status"><CustomerSourceText source={"Status"} /></Label><NativeSelect id="kit-request-status" value={search.requestStatus} onChange={event => change({ requestStatus: event.target.value as KitRequestListSearch['requestStatus'], requestPage: 1 })}><option value="open"><CustomerSourceText source={"Active requests"} /></option><option value="sent"><CustomerSourceText source={"Kits sent"} /></option><option value="received"><CustomerSourceText source={"Kits received"} /></option><option value="all"><CustomerSourceText source={"All requests"} /></option>{kitRequestStatuses.map(value => <option key={value} value={value}>{value === 'Received' ? <CustomerSourceText source={"Fully received requests"} /> : kitRequestStatus(value)}</option>)}</NativeSelect></Field>{needle || search.requestStatus !== 'open' ? <ClearFiltersButton  onClick={() => change({ requestSearch: undefined, requestStatus: 'open', requestPage: 1 })}></ClearFiltersButton> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {query.isLoading ? <LoadingState  label={<><CustomerSourceText source={"Loading kit requests…"} /></>} /> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Kit requests unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Refresh and try again.')} />} <Button size="sm" variant="outline" onClick={() => void query.refetch()}><CustomerSourceText source={"Retry"} /></Button></AlertDescription></Alert> : null}
    {query.data && !count ? <p className="py-5 text-sm text-muted-foreground">{query.data.length ? <CustomerSourceText source={"No kit requests or kits match these filters."} /> : <CustomerSourceText source={"No transportation-kit requests have been submitted."} />}</p> : null}
    {showKits ? <div className="space-y-3">{kits.slice((page - 1) * 12, page * 12).map(({ request, kit }) => <article key={kit.stockKitId} className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><RecordLink asChild><Link to="/lab-operations/stock-kits/$kitId" params={{ kitId: kit.stockKitId }} search={{ ...currentSearch, ...search, section: 'transportation-kits', receiptTab: 'standard-kits' }} >{kit.kitNumber}</Link></RecordLink><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName} <CustomerSourceText source={"· Job"} /> {request.jobNumber}{request.phaseName ? ` · ${request.phaseName}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">{kit.outboundCarrier} · {kit.outboundTrackingNumber}</p></div><div className="min-w-0 text-sm"><RecordLink asChild><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...currentSearch, ...search, section: 'kit-requests', receiptTab: undefined }} >{kitRequestReference(request)}</Link></RecordLink><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"Sent"} /> {<DisplayTimestamp value={kit.dispatchedAt} seconds />}{kit.receivedAt ? <> <CustomerSourceText source={"· Received"} /> {<DisplayTimestamp value={kit.receivedAt} seconds />}</> : null}</p></div><Badge variant="outline" className="h-fit max-w-full whitespace-normal">{kit.receivedAt ? <CustomerSourceText source={"Received by Customer"} /> : <CustomerSourceText source={"On the way"} />}</Badge></article>)}</div> : <div className="space-y-3">{requests.slice((page - 1) * 12, page * 12).map(request => <article key={request.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><RecordLink asChild><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...currentSearch, ...search, section: 'kit-requests', receiptTab: undefined }} >{kitRequestReference(request)}</Link></RecordLink><DomainStatusBadge status={request.status} tones={orderStatusTones}>{kitRequestStatus(request.status)}</DomainStatusBadge></div><p className="mt-1 text-sm wrap-anywhere">{request.organizationName} · {request.departmentName}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerSourceText source={"Job"} /> {request.jobNumber}{request.phaseName ? ` · ${request.phaseName}` : ''} · {<DisplayDate value={request.requestedAt} />}</p></div><div className="col-span-full row-start-2 min-w-0 space-y-1 text-sm md:col-span-1 md:col-start-2 md:row-start-1">{request.lines.map(line => <p className="wrap-anywhere" key={line.id}>{line.commonName} · {line.receivedQuantity} of {line.requestedQuantity} <CustomerSourceText source={"received ·"} /> {line.dispatchedQuantity} <CustomerSourceText source={"sent"} /></p>)}<p className="text-xs text-muted-foreground wrap-anywhere"><CustomerSourceText source={"Deliver to"} /> {request.deliveryAddress.label}</p></div><div className="col-start-2 row-start-1 self-start md:col-start-3"><KitRequestRowActions request={request} disabled={Boolean(query.error)} onAction={setAction} /></div></article>)}</div>}
    {count ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{count} {showKits ? <CustomerSourceText source={"kits"} /> : <CustomerSourceText source={"requests"} />} <CustomerSourceText source={"· Page"} /> {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => change({ requestPage: page - 1 })}><CustomerSourceText source={"Previous"} /></Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => change({ requestPage: page + 1 })}><CustomerSourceText source={"Next"} /></Button></div></div> : null}
  </CardContent>{action ? <DialogReturnFocus target={action.opener} fallbackId="kit-request-search"><KitRequestListActionDialog action={action} onClose={() => setAction(null)} /></DialogReturnFocus> : null}</Card>
}
