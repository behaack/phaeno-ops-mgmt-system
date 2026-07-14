import { createFileRoute } from '@tanstack/react-router'

import { UserManagementPanel } from '#/features/admin/UserManagementPanel'
import { useMockAdminData } from '#/features/admin/mock-admin-data'
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
import { isPhaenoEmployee } from '#/components/navigation'

export const Route = createFileRoute('/phaeno-users')({
  component: UsersPage,
})

const phaenoRoleOptions = [
  'Platform admin',
  'Operations admin',
  'Customer manager',
] as const

const customerRoleOptions = ['Organization admin', 'Member'] as const

function UsersPage() {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const {
    addCustomerUser,
    addPhaenoUser,
    customers,
    customerUsers,
    deactivateCustomerUser,
    deactivatePhaenoUser,
    phaenoUsers,
    updateCustomerUser,
    updatePhaenoUser,
  } = useMockAdminData()

  const selectedCustomerMembership =
    selectedMembership?.organizationKind === 'Customer'
      ? selectedMembership
      : null
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedOrganizationId,
  )
  const canManagePhaenoUsers =
    !selectedCustomer &&
    isPhaenoEmployee(session) &&
    Boolean(session?.capabilities.canManageAllUsers)
  const canManageSelectedCustomerUsers =
    selectedCustomer &&
    ((Boolean(selectedCustomerMembership?.isOrganizationAdmin) &&
      Boolean(session?.capabilities.canManageMembers)) ||
      (isPhaenoEmployee(session) &&
        Boolean(session?.capabilities.canManageOrganizations)))

  if (canManageSelectedCustomerUsers && selectedCustomer) {
    const scopedUsers = customerUsers.filter(
      (user) => user.customerId === selectedCustomer.id,
    )

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
            Manage users for {selectedCustomer.name}.
          </p>
        </section>

        <UserManagementPanel
          addLabel="Add customer user"
          description="Users who belong to the active customer organization."
          onAddUser={(user) => addCustomerUser(selectedCustomer.id, user)}
          onDeactivateUser={deactivateCustomerUser}
          onUpdateUser={updateCustomerUser}
          roleOptions={customerRoleOptions}
          title={`${selectedCustomer.name} users`}
          users={scopedUsers}
        />
      </main>
    )
  }

  if (canManagePhaenoUsers) {
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
            Manage Phaeno employee accounts, internal roles, and platform-level
            access.
          </p>
        </section>

        <UserManagementPanel
          addLabel="Add Phaeno user"
          description="Internal users who belong to the Phaeno parent organization."
          onAddUser={addPhaenoUser}
          onDeactivateUser={deactivatePhaenoUser}
          onUpdateUser={updatePhaenoUser}
          roleOptions={phaenoRoleOptions}
          title="Phaeno users"
          users={phaenoUsers}
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
