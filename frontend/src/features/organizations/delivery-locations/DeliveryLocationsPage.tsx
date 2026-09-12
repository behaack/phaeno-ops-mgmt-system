import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Ellipsis, Plus } from 'lucide-react'
import { useState } from 'react'
import { deactivateCustomerDeliveryLocation, getCustomerDeliveryLocation, getCustomerDeliveryLocations, type CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import { getOrganization, listDepartments } from '#/api/organization-management'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LocationKitInventoryPanel } from '#/features/sample-shipping/LocationKitInventoryPanel'
import { DeliveryLocationAddress } from './DeliveryLocationAddress'
import { DeliveryLocationEditor } from './DeliveryLocationEditor'
import { parseDeliveryLocationSearch, type DeliveryLocationSearch } from './delivery-location-navigation'

function useLocationContext() {
  const search = parseDeliveryLocationSearch(useSearch({ strict: false }))
  const { session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const organizationId = search.organizationId ?? selectedOrganizationId ?? ''
  const departmentId = search.departmentId ?? selectedDepartmentId ?? ''
  const membership = session?.memberships.find(value => value.organizationId === organizationId)
  const department = membership?.departments?.find(value => value.departmentId === departmentId)
  const staff = Boolean(session?.isPlatformAdmin)
  const canRead = session?.state === 'ready' && Boolean(organizationId && departmentId) && (staff || (membership?.organizationKind === 'Customer' && (membership.isOrganizationAdmin || department)))
  const canManage = Boolean(canRead && (staff || membership?.isOrganizationAdmin || department?.isDepartmentAdmin))
  const departments = useQuery({ queryKey: ['organization-departments', organizationId, true], queryFn: () => listDepartments(organizationId), enabled: Boolean(canRead) })
  const organization = useQuery({ queryKey: ['organization', organizationId], queryFn: () => getOrganization(organizationId), enabled: Boolean(canRead && staff) })
  return { scope: { organizationId, departmentId }, search: { ...search, organizationId, departmentId }, canRead: Boolean(canRead), canManage, isStaff: staff, canViewStaffKitInventory: staff && Boolean(session?.capabilities?.canManageOrderConfiguration),
    departmentName: departments.data?.find(value => value.id === departmentId)?.name ?? department?.departmentName ?? 'this department',
    organizationName: organization.data?.name ?? membership?.organizationName ?? 'Customer',
  }
}

export function DeliveryLocationsPage() {
  const context = useLocationContext(), client = useQueryClient(), navigate = useNavigate()
  const [editing, setEditing] = useState<CustomerDeliveryLocation | 'new' | null>(null)
  const query = useQuery({ queryKey: ['customer-delivery-locations', context.scope.organizationId, context.scope.departmentId], queryFn: () => getCustomerDeliveryLocations(context.scope), enabled: context.canRead })
  const needle = (context.search.locationSearch ?? '').trim().toLowerCase()
  const filtered = (query.data ?? []).filter(value => `${value.label} ${value.recipient} ${value.line1} ${value.city}`.toLowerCase().includes(needle))
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), page = Math.min(context.search.locationPage ?? 1, pages)
  function change(update: DeliveryLocationSearch) { void navigate({ to: '/delivery-locations', search: { ...context.search, ...update }, replace: true, resetScroll: false }) }
  async function saved(location: CustomerDeliveryLocation) {
    setEditing(null)
    await client.invalidateQueries({ queryKey: ['customer-delivery-locations'] })
    await client.invalidateQueries({ queryKey: ['transportation-kit-supply'] })
    await navigate({ to: '/delivery-locations/$locationId', params: { locationId: location.id }, search: context.search })
  }
  return <main className="page-wrap space-y-5 px-4 py-8"><LocationReturn search={context.search} />
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Delivery locations</h1><p className="mt-1 text-sm text-muted-foreground">{context.organizationName} · {context.departmentName}</p></div>{context.canManage ? <Button onClick={() => setEditing('new')}><Plus aria-hidden="true" />Add delivery location</Button> : null}</div>
    {!context.canRead ? <Unavailable /> : <Card><CardHeader><CardTitle>Transportation-kit delivery</CardTitle><CardDescription>Saved receiving addresses for this department. Existing kit requests retain their confirmed address.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-40 max-w-xl flex-1"><Label htmlFor="delivery-location-search">Search locations</Label><Input id="delivery-location-search" className="mt-2" placeholder="Location, recipient, or address" value={context.search.locationSearch ?? ''} onChange={event => change({ locationSearch: event.target.value || undefined, locationPage: 1 })} /></div>{needle ? <Button variant="ghost" onClick={() => change({ locationSearch: undefined, locationPage: 1 })}>Clear all</Button> : null}</div>
      {query.isLoading ? <p role="status">Loading delivery locations…</p> : null}
      {query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : null}
      {query.data && !filtered.length ? <p className="py-5 text-sm text-muted-foreground">{query.data.length ? 'No locations match this search.' : 'No delivery locations have been added for this department.'}</p> : null}
      <div className="divide-y">{filtered.slice((page - 1) * 12, page * 12).map(location => <article key={location.id} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link className="wrap-anywhere font-medium text-primary underline underline-offset-2" to="/delivery-locations/$locationId" params={{ locationId: location.id }} search={context.search}>{location.label}</Link>{location.isDefault ? <Badge variant="outline">Default</Badge> : null}</div><p className="mt-1 text-sm wrap-anywhere">{location.recipient}</p><p className="mt-1 text-sm text-muted-foreground wrap-anywhere">{location.line1} · {location.city}, {location.region} {location.postalCode}</p></div>{context.canManage ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon-sm" aria-label={`Actions for ${location.label}`}><Ellipsis aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setEditing(location)}>Edit location</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}</article>)}</div>
      {filtered.length ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} locations · Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => change({ locationPage: page - 1 })}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => change({ locationPage: page + 1 })}>Next</Button></div></div> : null}
    </CardContent></Card>}
    {editing && context.canManage ? <DeliveryLocationEditor scope={context.scope} source={editing === 'new' ? null : editing} initialDefault={!query.data?.length} departmentName={context.departmentName} onClose={() => setEditing(null)} onSaved={saved} /> : null}
  </main>
}

export function DeliveryLocationDetailPage({ locationId }: { locationId: string }) {
  const context = useLocationContext(), client = useQueryClient()
  const [editing, setEditing] = useState<CustomerDeliveryLocation | null>(null)
  const [deactivating, setDeactivating] = useState<CustomerDeliveryLocation | null>(null)
  const query = useQuery({ queryKey: ['customer-delivery-location', locationId, context.scope.organizationId, context.scope.departmentId], queryFn: () => getCustomerDeliveryLocation(locationId), enabled: context.canRead })
  const location = query.data?.organizationId === context.scope.organizationId && query.data.departmentId === context.scope.departmentId ? query.data : null
  async function saved(value: CustomerDeliveryLocation) { setEditing(null); setDeactivating(null); client.setQueryData(['customer-delivery-location', locationId, context.scope.organizationId, context.scope.departmentId], value); await Promise.all([client.invalidateQueries({ queryKey: ['customer-delivery-locations'] }), client.invalidateQueries({ queryKey: ['transportation-kit-supply'] }), query.refetch()]) }
  const deactivate = useMutation({ mutationFn: (value: CustomerDeliveryLocation) => deactivateCustomerDeliveryLocation(value.id, value.version), onSuccess: saved })
  return <main className="page-wrap space-y-5 px-4 py-8"><div className="flex flex-wrap gap-2"><Button asChild variant="ghost" size="sm"><Link to="/delivery-locations" search={context.search}><ArrowLeft aria-hidden="true" />Back to delivery locations</Link></Button>{context.search.shipmentId || context.search.returnOrderId ? <LocationReturn search={context.search} /> : null}</div>
    {!context.canRead ? <Unavailable /> : query.isLoading ? <p role="status">Loading delivery location…</p> : !location ? query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : <Unavailable /> : <>
      {query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold wrap-anywhere">{location.label}</h1>{location.isDefault ? <Badge variant="outline">Default</Badge> : null}{!location.isActive ? <Badge variant="outline">Inactive</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">{context.organizationName} · {context.departmentName}</p></div>
        {context.canManage && location.isActive ? <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" aria-label="Location actions">Actions</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
            <DropdownMenuItem onSelect={() => setEditing(location)}>Edit location</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { deactivate.reset(); setDeactivating(location) }}>Deactivate location</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> : null}
      </div>
      <Card>
        <CardHeader><CardTitle>Delivery address</CardTitle><CardDescription>{context.isStaff ? 'Used for transportation-kit deliveries to this customer department.' : 'Phaeno will send your department’s transportation kits to this address.'}</CardDescription></CardHeader>
        <CardContent><DeliveryLocationAddress location={location} /></CardContent>
      </Card>
      {context.isStaff ? <Card><CardHeader><CardTitle>Transportation kits</CardTitle><CardDescription>Review delivery and inventory in Phaeno’s standard-kit records. The Customer acknowledges arrival at this location.</CardDescription></CardHeader>{context.canViewStaffKitInventory ? <CardContent><Button asChild variant="outline"><Link to="/lab-operations" search={{ section: 'receipt', receiptTab: 'standard-kits', kitSearch: location.label }} hash="standard-kits">View Phaeno kit inventory</Link></Button></CardContent> : null}</Card> : <LocationKitInventoryPanel locationId={location.id} organizationId={location.organizationId} departmentId={location.departmentId} canManage={context.canManage} />}
      {editing ? <DeliveryLocationEditor scope={context.scope} source={editing} departmentName={context.departmentName} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    </>}
    <Dialog open={Boolean(deactivating)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivating(null) }}><DialogContent><DialogHeader><DialogTitle>Deactivate delivery location</DialogTitle><DialogDescription>{deactivating?.label} will no longer be offered for new kit requests. Existing requests keep their saved delivery address.</DialogDescription></DialogHeader>{deactivate.error ? <LocationError error={deactivate.error} /> : null}<DialogFooter><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivating(null)}>Cancel</Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivating) deactivate.mutate(deactivating) }}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate location'}</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
function LocationReturn({ search }: { search: DeliveryLocationSearch }) {
  return <div className="flex flex-wrap gap-2">{search.returnOrderId ? <Button asChild size="sm" variant="ghost"><Link to="/lab-services/$orderId" params={{ orderId: search.returnOrderId }} search={{ shipmentId: search.shipmentId, shippingView: 'tubes' }}><ArrowLeft aria-hidden="true" />Return to Lab Job</Link></Button> : search.shipmentId ? <Button asChild size="sm" variant="ghost"><Link to="/sample-shipping/$shipmentId" params={{ shipmentId: search.shipmentId }}><ArrowLeft aria-hidden="true" />Return to shipment</Link></Button> : search.companyId ? <Button asChild size="sm" variant="ghost"><Link to="/crm/companies/$companyId" params={{ companyId: search.companyId }}><ArrowLeft aria-hidden="true" />Back to customer</Link></Button> : <Button asChild size="sm" variant="ghost"><Link to="/departments"><ArrowLeft aria-hidden="true" />Back to departments</Link></Button>}</div>
}
function Unavailable() { return <Alert><AlertTitle>Delivery locations unavailable</AlertTitle><AlertDescription>Open a Customer department that you have permission to access.</AlertDescription></Alert> }
function LocationError({ error, retry }: { error: unknown; retry?: () => void }) { return <Alert variant="destructive"><AlertTitle>Delivery location unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Try again.')}{retry ? <Button className="ml-2" size="sm" variant="outline" onClick={retry}>Retry</Button> : null}</AlertDescription></Alert> }
