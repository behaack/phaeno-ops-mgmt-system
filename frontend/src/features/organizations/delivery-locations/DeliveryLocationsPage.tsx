import { ClearFiltersButton } from '#/components/ui/clear-filters-button'
import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { BackLink } from '#/components/ui/back-link'
import { ActionMenu, ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Ellipsis, Plus } from 'lucide-react'
import { useState } from 'react'
import { deactivateCustomerDeliveryLocation, getCustomerDeliveryLocation, getCustomerDeliveryLocations, type CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import { getOrganization, listDepartments } from '#/api/organization-management'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

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
  const __customerSource = useCustomerSourceText()

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
    <div><PageTitle><CustomerSourceText source={"Delivery locations"} /></PageTitle><p className="mt-1 text-sm text-muted-foreground">{context.organizationName} · {context.departmentName}</p></div>
    {!context.canRead ? <Unavailable /> : <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle><CustomerSourceText source={"Transportation-kit delivery"} /></CardTitle><CardDescription><CustomerSourceText source={"Saved receiving addresses for this department. Existing kit requests retain their confirmed address."} /></CardDescription>{context.canManage ? <CardAction><Button size="sm" onClick={() => setEditing('new')}><Plus aria-hidden="true" /><CustomerSourceText source={"Add delivery location"} /></Button></CardAction> : null}</CardHeader><CardContent className="space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3"><PortalField className="min-w-40 max-w-xl flex-1"><Label htmlFor="delivery-location-search"><CustomerSourceText source={"Search locations"} /></Label><Input id="delivery-location-search"  placeholder={__customerSource("Location, recipient, or address")} value={context.search.locationSearch ?? ''} onChange={event => change({ locationSearch: event.target.value || undefined, locationPage: 1 })} /></PortalField>{needle ? <ClearFiltersButton  onClick={() => change({ locationSearch: undefined, locationPage: 1 })}></ClearFiltersButton> : null}</div>
      {query.isLoading ? <p role="status"><CustomerSourceText source={"Loading delivery locations…"} /></p> : null}
      {query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : null}
      {query.data && !filtered.length ? <p className="py-5 text-sm text-muted-foreground">{query.data.length ? <CustomerSourceText source={"No locations match this search."} /> : <CustomerSourceText source={"No delivery locations have been added for this department."} />}</p> : null}
      <div className="divide-y">{filtered.slice((page - 1) * 12, page * 12).map(location => <article key={location.id} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="wrap-anywhere"><RecordLink asChild><Link to="/delivery-locations/$locationId" params={{ locationId: location.id }} search={context.search}>{location.label}</Link></RecordLink></span>{location.isDefault ? <Badge variant="outline"><CustomerSourceText source={"Default"} /></Badge> : null}</div><p className="mt-1 text-sm wrap-anywhere">{location.recipient}</p><p className="mt-1 text-sm text-muted-foreground wrap-anywhere">{location.line1} · {location.city}, {location.region} {location.postalCode}</p></div>{context.canManage ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon-sm" aria-label={`Actions for ${location.label}`}><Ellipsis aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setEditing(location)}><CustomerSourceText source={"Edit location"} /></DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}</article>)}</div>
      {filtered.length ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} <CustomerSourceText source={"locations · Page"} /> {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => change({ locationPage: page - 1 })}><CustomerSourceText source={"Previous"} /></Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => change({ locationPage: page + 1 })}><CustomerSourceText source={"Next"} /></Button></div></div> : null}
    </CardContent></Card>}
    {editing && context.canManage ? <DeliveryLocationEditor scope={context.scope} source={editing === 'new' ? null : editing} initialDefault={!query.data?.length} departmentName={context.departmentName} onClose={() => setEditing(null)} onSaved={saved} /> : null}
  </main>
}

export function DeliveryLocationDetailPage({ locationId }: { locationId: string }) {
  const __customerSource = useCustomerSourceText()

  const context = useLocationContext(), client = useQueryClient()
  const [editing, setEditing] = useState<CustomerDeliveryLocation | null>(null)
  const [deactivating, setDeactivating] = useState<CustomerDeliveryLocation | null>(null)
  const query = useQuery({ queryKey: ['customer-delivery-location', locationId, context.scope.organizationId, context.scope.departmentId], queryFn: () => getCustomerDeliveryLocation(locationId), enabled: context.canRead })
  const location = query.data?.organizationId === context.scope.organizationId && query.data.departmentId === context.scope.departmentId ? query.data : null
  async function saved(value: CustomerDeliveryLocation) { setEditing(null); setDeactivating(null); client.setQueryData(['customer-delivery-location', locationId, context.scope.organizationId, context.scope.departmentId], value); await Promise.all([client.invalidateQueries({ queryKey: ['customer-delivery-locations'] }), client.invalidateQueries({ queryKey: ['transportation-kit-supply'] }), query.refetch()]) }
  const deactivate = useMutation({ mutationFn: (value: CustomerDeliveryLocation) => deactivateCustomerDeliveryLocation(value.id, value.version), onSuccess: saved })
  return <main className="page-wrap space-y-5 px-4 py-8"><div className="flex flex-wrap gap-2"><BackLink asChild>{context.search.returnToSettings ? <Link to="/departments" search={{ settingsTab: 'delivery', settingsDepartmentId: context.scope.departmentId }}><CustomerSourceText source={"Back to Customer settings"} /></Link> : <Link to="/delivery-locations" search={context.search}><CustomerSourceText source={"Back to delivery locations"} /></Link>}</BackLink>{context.search.shipmentId || context.search.returnOrderId ? <LocationReturn search={context.search} /> : null}</div>
    {!context.canRead ? <Unavailable /> : query.isLoading ? <p role="status"><CustomerSourceText source={"Loading delivery location…"} /></p> : !location ? query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : <Unavailable /> : <>
      {query.error ? <LocationError error={query.error} retry={() => void query.refetch()} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><PageTitle className="wrap-anywhere">{location.label}</PageTitle>{location.isDefault ? <Badge variant="outline"><CustomerSourceText source={"Default"} /></Badge> : null}{!location.isActive ? <Badge variant="outline"><CustomerSourceText source={"Inactive"} /></Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">{context.organizationName} · {context.departmentName}</p></div>
        {context.canManage && location.isActive ? <ActionMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" aria-label={__customerSource("Location actions")}><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
            <DropdownMenuItem onSelect={() => setEditing(location)}><CustomerSourceText source={"Edit location"} /></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { deactivate.reset(); setDeactivating(location) }}><CustomerSourceText source={"Deactivate location"} /></DropdownMenuItem>
          </DropdownMenuContent>
        </ActionMenu> : null}
      </div>
      <Card>
        <CardHeader><CardTitle><CustomerSourceText source={"Delivery address"} /></CardTitle><CardDescription>{context.isStaff ? <CustomerSourceText source={"Used for transportation-kit deliveries to this customer department."} /> : <CustomerSourceText source={"Phaeno will send your department’s transportation kits to this address."} />}</CardDescription></CardHeader>
        <CardContent><DeliveryLocationAddress location={location} /></CardContent>
      </Card>
      {context.isStaff ? <Card><CardHeader><CardTitle><CustomerSourceText source={"Transportation kits"} /></CardTitle><CardDescription><CustomerSourceText source={"Review delivery and inventory in Phaeno’s standard-kit records. The Customer acknowledges arrival at this location."} /></CardDescription></CardHeader>{context.canViewStaffKitInventory ? <CardContent><Button asChild variant="outline"><Link to="/lab-operations" search={{ section: 'receipt', receiptTab: 'standard-kits', kitSearch: location.label }} hash="standard-kits"><CustomerSourceText source={"View Phaeno kit inventory"} /></Link></Button></CardContent> : null}</Card> : <LocationKitInventoryPanel locationId={location.id} organizationId={location.organizationId} departmentId={location.departmentId} canManage={context.canManage} />}
      {editing ? <DeliveryLocationEditor scope={context.scope} source={editing} departmentName={context.departmentName} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    </>}
    <Dialog open={Boolean(deactivating)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivating(null) }}><DialogContent><DialogHeader><DialogTitle><CustomerSourceText source={"Deactivate delivery location"} /></DialogTitle><DialogDescription>{deactivating?.label} <CustomerSourceText source={"will no longer be offered for new kit requests. Existing requests keep their saved delivery address."} /></DialogDescription></DialogHeader>{deactivate.error ? <LocationError error={deactivate.error} /> : null}<DialogFooter><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivating(null)}><CustomerSourceText source={"Cancel"} /></Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivating) deactivate.mutate(deactivating) }}>{deactivate.isPending ? <CustomerSourceText source={"Deactivating…"} /> : <CustomerSourceText source={"Deactivate location"} />}</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
function LocationReturn({ search }: { search: DeliveryLocationSearch }) {
  return <div className="flex flex-wrap gap-2">{search.returnOrderId ? <BackLink asChild><Link to="/lab-services/$orderId" params={{ orderId: search.returnOrderId }} search={{ shipmentId: search.shipmentId, shippingView: 'tubes', orderKits: search.resumeKitOrder }}><CustomerSourceText source={"Return to Lab Job"} /></Link></BackLink> : search.shipmentId ? <BackLink asChild><Link to="/sample-shipping/$shipmentId" params={{ shipmentId: search.shipmentId }} search={search.resumeKitOrder ? { orderKits: true } : undefined}><CustomerSourceText source={"Return to shipment"} /></Link></BackLink> : search.companyId ? <BackLink asChild><Link to="/crm/companies/$companyId" params={{ companyId: search.companyId }}><CustomerSourceText source={"Back to customer"} /></Link></BackLink> : <BackLink asChild><Link to="/departments" search={{ settingsTab: 'delivery', settingsDepartmentId: search.departmentId }}><CustomerSourceText source={"Back to Customer settings"} /></Link></BackLink>}</div>
}
function Unavailable() { return <Alert><AlertTitle><CustomerSourceText source={"Delivery locations unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Open a Customer department that you have permission to access."} /></AlertDescription></Alert> }
function LocationError({ error, retry }: { error: unknown; retry?: () => void }) { return <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Delivery location unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Try again.')} />}{retry ? <Button className="ml-2" size="sm" variant="outline" onClick={retry}><CustomerSourceText source={"Retry"} /></Button> : null}</AlertDescription></Alert> }
