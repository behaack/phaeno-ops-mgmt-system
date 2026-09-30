import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { getCustomerDeliveryLocations, type CustomerDeliveryLocation } from '#/api/customer-delivery-locations'
import { listDepartments } from '#/api/organization-management'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { isExternalOrganizationKind } from '#/components/navigation'
import { OrganizationUserManagementPanel } from '#/features/admin/OrganizationUserManagementPanel'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { DeliveryLocationEditor } from './delivery-locations/DeliveryLocationEditor'
import { OrganizationDefaultsPanel } from './OrganizationDefaultsPanel'
import { OrganizationDepartmentsPanel } from './OrganizationDepartmentsPanel'
import { departmentErrorMessage, departmentMessages as m } from './department-localization'
import type { CustomerSettingsSearch, CustomerSettingsTab } from './customer-settings-navigation'

export function DepartmentAdministrationPage() {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const search = useSearch({ from: '/departments' })
  const navigate = useNavigate()
  const membership = getSelectedMembership(session, selectedOrganizationId)
  const managedDepartmentIds = membership?.departments?.filter((department) => department.isDepartmentAdmin).map((department) => department.departmentId) ?? []
  const allowed = session?.state === 'ready' && isExternalOrganizationKind(membership?.organizationKind)
    && (membership?.isOrganizationAdmin || managedDepartmentIds.length > 0)
  const customerSettings = allowed && membership?.organizationKind === 'Customer'
  const canManageUsers = Boolean(membership?.isOrganizationAdmin && session?.capabilities.canManageMembers)
  const requestedTab = search.settingsTab ?? 'delivery'
  const activeTab = (requestedTab === 'defaults' && !membership?.isOrganizationAdmin) || (requestedTab === 'people' && !canManageUsers) ? 'delivery' : requestedTab
  function changeSearch(update: CustomerSettingsSearch) {
    void navigate({ to: '/departments', search: { ...search, ...update }, replace: true, resetScroll: false })
  }
  return <main className="page-wrap space-y-6 px-4 py-8">
    <section>
      <h1 className="text-3xl font-semibold">{customerSettings ? 'Customer settings' : allowed && membership ? m.pageTitle(membership.organizationName) : m.unavailable}</h1>
      {customerSettings ? <p className="mt-1 text-sm text-muted-foreground">{membership.organizationName}</p> : null}
      {!allowed ? <p className="mt-3 text-sm text-muted-foreground">{m.unavailableDescription}</p> : null}
    </section>
    {customerSettings && selectedOrganizationId ? <Tabs value={activeTab} onValueChange={value => changeSearch({ settingsTab: value as CustomerSettingsTab })}>
      <TabsList aria-label="Customer settings sections" className="flex w-full flex-wrap justify-start">
        <TabsTrigger className="min-w-fit flex-none" value="delivery">Transportation-kit delivery</TabsTrigger>
        <TabsTrigger className="min-w-fit flex-none" value="departments">Departments</TabsTrigger>
        {membership.isOrganizationAdmin ? <TabsTrigger className="min-w-fit flex-none" value="defaults">Organization defaults</TabsTrigger> : null}
        {canManageUsers ? <TabsTrigger className="min-w-fit flex-none" value="people">People and access</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="delivery" className="mt-4"><CustomerDeliverySettings organizationId={selectedOrganizationId} organizationAdmin={Boolean(membership.isOrganizationAdmin)} managedDepartmentIds={managedDepartmentIds} currentDepartmentId={selectedDepartmentId ?? null} settingsDepartmentId={search.settingsDepartmentId} onDepartmentChange={departmentId => changeSearch({ settingsDepartmentId: departmentId })} /></TabsContent>
      <TabsContent value="departments" className="mt-4"><OrganizationDepartmentsPanel key={selectedOrganizationId} organizationId={selectedOrganizationId} organizationAdmin={Boolean(membership.isOrganizationAdmin)} managedDepartmentIds={managedDepartmentIds} showOrganizationDefaults={false} /></TabsContent>
      {membership.isOrganizationAdmin ? <TabsContent value="defaults" className="mt-4"><OrganizationDefaultsPanel organizationId={selectedOrganizationId} /></TabsContent> : null}
      {canManageUsers ? <TabsContent value="people" className="mt-4">{authProvider === 'mock' || !session?.user ? <Alert><AlertDescription>Connected sign-in is required to manage Customer users.</AlertDescription></Alert> : <OrganizationUserManagementPanel currentUserId={session.user.id} organizationId={selectedOrganizationId} organizationName={membership.organizationName} />}</TabsContent> : null}
    </Tabs> : allowed && selectedOrganizationId ? <OrganizationDepartmentsPanel
      key={selectedOrganizationId}
      organizationId={selectedOrganizationId}
      organizationAdmin={Boolean(membership?.isOrganizationAdmin)}
      managedDepartmentIds={managedDepartmentIds}
    /> : null}
  </main>
}

function CustomerDeliverySettings({ organizationId, organizationAdmin, managedDepartmentIds, currentDepartmentId, settingsDepartmentId, onDepartmentChange }: {
  organizationId: string
  organizationAdmin: boolean
  managedDepartmentIds: string[]
  currentDepartmentId: string | null
  settingsDepartmentId?: string
  onDepartmentChange: (departmentId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const client = useQueryClient()
  const navigate = useNavigate()
  const departments = useQuery({ queryKey: ['organization-departments', organizationId, true], queryFn: () => listDepartments(organizationId) })
  const available = (departments.data ?? []).filter(department => department.isActive && (organizationAdmin || managedDepartmentIds.includes(department.id)))
  const department = available.find(value => value.id === settingsDepartmentId)
    ?? available.find(value => value.id === currentDepartmentId)
    ?? available[0]
  const departmentId = department?.id ?? ''
  const locations = useQuery({ queryKey: ['customer-delivery-locations', organizationId, departmentId], queryFn: () => getCustomerDeliveryLocations({ organizationId, departmentId }), enabled: Boolean(departmentId) })
  async function saved(location: CustomerDeliveryLocation) {
    setAdding(false)
    await client.invalidateQueries({ queryKey: ['customer-delivery-locations', organizationId, departmentId] })
    await navigate({ to: '/delivery-locations/$locationId', params: { locationId: location.id }, search: { organizationId, departmentId, returnToSettings: true } })
  }

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Transportation-kit delivery</CardTitle>
      <CardDescription>Saved receiving addresses for this Department. Existing kit requests keep their confirmed address.</CardDescription>
      {department ? <CardAction><Button size="sm" disabled={locations.isLoading || Boolean(locations.error)} onClick={() => setAdding(true)}><Plus aria-hidden="true" />Add delivery location</Button></CardAction> : null}
    </CardHeader>
    <CardContent className="space-y-4 p-4">
      {departments.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading Departments…</p> : null}
      {departments.error ? <Alert variant="destructive"><AlertDescription>{departmentErrorMessage(departments.error)}</AlertDescription></Alert> : null}
      {!departments.isLoading && !departments.error && !available.length ? <p className="text-sm text-muted-foreground">No active Departments are available to manage.</p> : null}
      {department ? <div className="max-w-sm space-y-2"><label htmlFor="delivery-settings-department" className="text-sm font-medium">Department</label><select id="delivery-settings-department" className="h-10 w-full cursor-pointer rounded-md border bg-background px-3 text-sm" value={departmentId} onChange={event => onDepartmentChange(event.target.value)}>{available.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></div> : null}
      {locations.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading delivery locations…</p> : null}
      {locations.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(locations.error, 'Delivery locations could not be loaded.')} <Button variant="link" onClick={() => void locations.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {locations.data && !locations.data.length ? <p className="py-3 text-sm text-muted-foreground">No delivery locations have been added for this Department.</p> : null}
      {locations.data?.length ? <div className="divide-y">{locations.data.map(location => <article key={location.id} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center gap-2"><Link className="font-medium text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring" to="/delivery-locations/$locationId" params={{ locationId: location.id }} search={{ organizationId, departmentId, returnToSettings: true }}>{location.label}</Link>{location.isDefault ? <Badge variant="outline">Default</Badge> : null}</div>
        <p className="mt-1 text-sm">{location.recipient}</p>
        <p className="mt-1 text-sm text-muted-foreground">{location.line1}{location.line2 ? `, ${location.line2}` : ''} · {location.city}, {location.region} {location.postalCode}</p>
      </article>)}</div> : null}
    </CardContent>
    {adding && department ? <DeliveryLocationEditor scope={{ organizationId, departmentId }} source={null} initialDefault={!locations.data?.length} departmentName={department.name} onClose={() => setAdding(false)} onSaved={saved} /> : null}
  </Card>
}
