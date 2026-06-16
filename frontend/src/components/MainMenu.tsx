import { Link } from '@tanstack/react-router'

import { mainMenuItems } from './navigation'
import { usePhaenoSession } from '#/features/auth/session-context'

export function MainMenu() {
  const { signedIn } = usePhaenoSession()

  if (!signedIn) {
    return null
  }

  return (
    <div className="hidden items-center gap-4 text-sm font-medium md:flex">
      {mainMenuItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </Link>
      ))}
    </div>
  )
}
