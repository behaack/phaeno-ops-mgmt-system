import { createFileRoute } from '@tanstack/react-router'

import { OrganizationUserManagementPanel } from '#/features/admin/OrganizationUserManagementPanel'
import { PhaenoUserManagementPanel } from '#/features/admin/PhaenoUserManagementPanel'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  isExternalOrganizationKind,
  isPhaenoEmployee,
} from '#/components/navigation'

export const Route = createFileRoute('/phaeno-users')({
  component: UsersPage,
})

function UsersPage() {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const selectedCustomerMembership =
    isExternalOrganizationKind(selectedMembership?.organizationKind)
      ? selectedMembership
      : null
  const canManagePhaenoUsers =
    selectedMembership?.organizationKind === 'Phaeno' &&
    isPhaenoEmployee(session) &&
    (Boolean(session?.capabilities.canManageAllUsers) ||
      Boolean(session?.capabilities.canManageLabAccess))
  const canManageSelectedCustomerUsers =
    selectedCustomerMembership &&
    ((Boolean(selectedCustomerMembership?.isOrganizationAdmin) &&
      Boolean(session?.capabilities.canManageMembers)) ||
      (isPhaenoEmployee(session) &&
        Boolean(session?.capabilities.canManageOrganizations)))

  if (authProvider === 'mock') {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Connected authentication required</CardTitle>
            <CardDescription>
              User management now reads and writes durable account and role
              records. Disable the frontend mock-session setting and sign in
              through the configured identity provider to use it.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (
    canManageSelectedCustomerUsers &&
    selectedCustomerMembership &&
    selectedOrganizationId
  ) {
    return (
      <main className="page-wrap px-4 py-8">
        <section className="mb-6 max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Customer user administration
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">
            User management
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage users for {selectedCustomerMembership.organizationName}.
          </p>
        </section>

        <OrganizationUserManagementPanel
          organizationId={selectedOrganizationId}
          organizationName={selectedCustomerMembership.organizationName}
        />
      </main>
    )
  }

  if (canManagePhaenoUsers && selectedOrganizationId) {
    return (
      <main className="page-wrap px-4 py-8">
        <section className="mb-6 max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Internal Phaeno administration
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">
            User management
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage Phaeno employee accounts, platform access, and laboratory
            roles.
          </p>
        </section>

        <PhaenoUserManagementPanel
          canManageAccounts={Boolean(session?.capabilities.canManageAllUsers)}
          canManageLabRoles={Boolean(session?.capabilities.canManageLabAccess)}
          organizationId={selectedOrganizationId}
        />
      </main>
    )
  }

  return (
    <main className="page-wrap px-4 py-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>User management unavailable</CardTitle>
          <CardDescription>
            The active organization context does not have user-management
            rights.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select a customer where you have administrator access, or return to the
          Phaeno organization with internal user-management rights.
        </CardContent>
      </Card>
    </main>
  )
}
