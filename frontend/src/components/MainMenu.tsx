import { Link } from '@tanstack/react-router'

import { getVisibleMainMenuItems } from './navigation'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

export function MainMenu() {
  const { signedIn, session, selectedOrganizationId } = usePhaenoSession()

  if (!signedIn) {
    return null
  }

  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const visibleMenuItems = getVisibleMainMenuItems(session, {
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
