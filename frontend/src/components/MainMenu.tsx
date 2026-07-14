import { Link } from '@tanstack/react-router'

import { getVisibleMainMenuItems } from './navigation'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { useMockAdminData } from '#/features/admin/mock-admin-data'

export function MainMenu() {
  const { signedIn, session, selectedOrganizationId } = usePhaenoSession()
  const { customers } = useMockAdminData()

  if (!signedIn) {
    return null
  }

  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const selectedOrganizationKind =
    selectedMembership?.organizationKind ??
    (customers.some((customer) => customer.id === selectedOrganizationId)
      ? 'Customer'
      : null)
  const visibleMenuItems = getVisibleMainMenuItems(session, {
    selectedOrganizationKind,
    selectedMembership,
  })

  return (
    <div className="hidden items-center gap-4 text-sm font-medium md:ml-auto md:flex">
      {visibleMenuItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
          activeOptions={item.exact ? { exact: true } : undefined}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </Link>
      ))}
    </div>
  )
}
