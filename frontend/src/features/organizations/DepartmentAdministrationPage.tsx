import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { isExternalOrganizationKind } from '#/components/navigation'
import { OrganizationDepartmentsPanel } from './OrganizationDepartmentsPanel'
import { departmentMessages as m } from './department-localization'

export function DepartmentAdministrationPage() {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const membership = getSelectedMembership(session, selectedOrganizationId)
  const managedDepartmentIds = membership?.departments?.filter((department) => department.isDepartmentAdmin).map((department) => department.departmentId) ?? []
  const allowed = session?.state === 'ready' && isExternalOrganizationKind(membership?.organizationKind)
    && (membership?.isOrganizationAdmin || managedDepartmentIds.length > 0)
  return <main className="page-wrap space-y-6 px-4 py-8">
    <section>
      <h1 className="text-3xl font-semibold">{allowed && membership ? m.pageTitle(membership.organizationName) : m.unavailable}</h1>
      {!allowed ? <p className="mt-3 text-sm text-muted-foreground">{m.unavailableDescription}</p> : null}
    </section>
    {allowed && selectedOrganizationId ? <OrganizationDepartmentsPanel
      key={selectedOrganizationId}
      organizationId={selectedOrganizationId}
      organizationAdmin={Boolean(membership?.isOrganizationAdmin)}
      managedDepartmentIds={managedDepartmentIds}
    /> : null}
  </main>
}
