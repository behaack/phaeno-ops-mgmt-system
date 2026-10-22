import { Field as PortalField } from '#/components/ui/field'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useCustomerMessages } from '#/features/customer-i18n/use-customer-messages'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
import { departmentErrorMessage, departmentMessages } from './department-localization'
import type { CustomerSettingsSearch, CustomerSettingsTab } from './customer-settings-navigation'

export function DepartmentAdministrationPage() {
  const m = useCustomerMessages(departmentMessages)

  const __customerText = useCustomerText()

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
      <PageTitle>{customerSettings ? <CustomerSourceText source={"Customer settings"} /> : allowed && membership ? m.pageTitle(membership.organizationName) : m.unavailable}</PageTitle>
      {customerSettings ? <p className="mt-1 text-sm text-muted-foreground">{membership.organizationName}</p> : null}
      {!allowed ? <p className="mt-3 text-sm text-muted-foreground">{m.unavailableDescription}</p> : null}
    </section>
    {customerSettings && selectedOrganizationId ? <Tabs value={activeTab} onValueChange={value => changeSearch({ settingsTab: value as CustomerSettingsTab })}>
      <TabsList aria-label={__customerText('m_8041fa57023e')} className="flex w-full flex-wrap justify-start">
        <TabsTrigger className="min-w-fit flex-none" value="delivery"><CustomerText message="m_e94bd442fd6a" /></TabsTrigger>
        <TabsTrigger className="min-w-fit flex-none" value="departments"><CustomerText message="m_5f9494c4d217" /></TabsTrigger>
        {membership.isOrganizationAdmin ? <TabsTrigger className="min-w-fit flex-none" value="defaults"><CustomerText message="m_ab4302311bc1" /></TabsTrigger> : null}
        {canManageUsers ? <TabsTrigger className="min-w-fit flex-none" value="people"><CustomerText message="m_1e133caaec46" /></TabsTrigger> : null}
      </TabsList>
      <TabsContent value="delivery" className="mt-4"><CustomerDeliverySettings organizationId={selectedOrganizationId} organizationAdmin={Boolean(membership.isOrganizationAdmin)} managedDepartmentIds={managedDepartmentIds} currentDepartmentId={selectedDepartmentId ?? null} settingsDepartmentId={search.settingsDepartmentId} onDepartmentChange={departmentId => changeSearch({ settingsDepartmentId: departmentId })} /></TabsContent>
      <TabsContent value="departments" className="mt-4"><OrganizationDepartmentsPanel key={selectedOrganizationId} organizationId={selectedOrganizationId} organizationAdmin={Boolean(membership.isOrganizationAdmin)} managedDepartmentIds={managedDepartmentIds} showOrganizationDefaults={false} /></TabsContent>
      {membership.isOrganizationAdmin ? <TabsContent value="defaults" className="mt-4"><OrganizationDefaultsPanel organizationId={selectedOrganizationId} /></TabsContent> : null}
      {canManageUsers ? <TabsContent value="people" className="mt-4">{authProvider === 'mock' || !session?.user ? <Alert><AlertDescription><CustomerText message="m_f585d64c8dc3" /></AlertDescription></Alert> : <OrganizationUserManagementPanel currentUserId={session.user.id} organizationId={selectedOrganizationId} organizationName={membership.organizationName} />}</TabsContent> : null}
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
    <CardHeader >
      <CardTitle><CustomerText message="m_e94bd442fd6a" /></CardTitle>
      <CardDescription><CustomerText message="m_bda4b1201955" /></CardDescription>
      {department ? <CardAction><Button size="sm" disabled={locations.isLoading || Boolean(locations.error)} onClick={() => setAdding(true)}><Plus aria-hidden="true" /><CustomerText message="m_119e50923ce6" /></Button></CardAction> : null}
    </CardHeader>
    <CardContent className="space-y-4 p-4">
      {departments.isLoading ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_4480f335645b" /></p> : null}
      {departments.error ? <Alert variant="destructive"><AlertDescription><CustomerSourceText source={departmentErrorMessage(departments.error)} /></AlertDescription></Alert> : null}
      {!departments.isLoading && !departments.error && !available.length ? <p className="text-sm text-muted-foreground"><CustomerText message="m_f2a5ef358626" /></p> : null}
      {department ? <PortalField className="max-w-sm"><label htmlFor="delivery-settings-department" className="text-sm font-medium"><CustomerText message="m_5304ab98e581" /></label><NativeSelect id="delivery-settings-department" className="w-full" value={departmentId} onChange={event => onDepartmentChange(event.target.value)}>{available.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</NativeSelect></PortalField> : null}
      {locations.isLoading ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_89353834ce2d" /></p> : null}
      {locations.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(locations.error, 'Delivery locations could not be loaded.')} />} <Button variant="link" onClick={() => void locations.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      {locations.data && !locations.data.length ? <p className="py-3 text-sm text-muted-foreground"><CustomerText message="m_094e1e57c71a" /></p> : null}
      {locations.data?.length ? <div className="divide-y">{locations.data.map(location => <article key={location.id} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center gap-2"><RecordLink asChild><Link to="/delivery-locations/$locationId" params={{ locationId: location.id }} search={{ organizationId, departmentId, returnToSettings: true }}>{location.label}</Link></RecordLink>{location.isDefault ? <Badge variant="outline"><CustomerText message="m_21b111cbfe6e" /></Badge> : null}</div>
        <p className="mt-1 text-sm">{location.recipient}</p>
        <p className="mt-1 text-sm text-muted-foreground">{location.line1}{location.line2 ? `, ${location.line2}` : ''} · {location.city}, {location.region} {location.postalCode}</p>
      </article>)}</div> : null}
    </CardContent>
    {adding && department ? <DeliveryLocationEditor scope={{ organizationId, departmentId }} source={null} initialDefault={!locations.data?.length} departmentName={department.name} onClose={() => setAdding(false)} onSaved={saved} /> : null}
  </Card>
}
