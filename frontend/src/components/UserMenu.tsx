import { Link, useRouterState } from '@tanstack/react-router'
import { SignOutButton } from '@clerk/react'
import {
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  UsersRound,
} from 'lucide-react'

import {
  canManageUserScope,
  getVisibleMainMenuItems,
} from './navigation'
import { type ThemeMode, useThemeMode } from './theme-mode'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

const displayModes: readonly {
  label: string
  value: ThemeMode
  icon: typeof Monitor
}[] = [
  { label: 'System', value: 'auto', icon: Monitor },
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
]

export function UserMenu() {
  const { mode, setMode } = useThemeMode()
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  })
  const {
    authProvider,
    signedIn,
    session,
    selectedOrganizationId,
  } = usePhaenoSession()
  const user = session?.user
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const selectedOrganizationKind = selectedMembership?.organizationKind ?? null
  const navigationContext = {
    selectedOrganizationKind,
    selectedMembership,
  }
  const workspaceMenuItems = getVisibleMainMenuItems(
    session,
    navigationContext,
    'workspace',
  )
  const administrationMenuItems = getVisibleMainMenuItems(
    session,
    navigationContext,
    'administration',
  )
  const resourceMenuItems = getVisibleMainMenuItems(
    session,
    navigationContext,
    'resources',
  )
  const showUserManagement = canManageUserScope(
    session,
    selectedMembership,
    selectedOrganizationKind,
  )
  if (!signedIn) {
    return null
  }

  return (
    <DropdownMenu modal>
      <DropdownMenuTrigger
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-all outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Open user menu"
      >
        <Menu aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
      >
        <DropdownMenuLabel>
          <span className="flex min-w-0 items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback>
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
              </span>
              <span className="block truncate text-xs">{user?.email}</span>
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Display</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as ThemeMode)}
          className="grid grid-cols-3 gap-1"
        >
          {displayModes.map((displayMode) => (
            <DropdownMenuRadioItem
              key={displayMode.value}
              value={displayMode.value}
              aria-label={`Use ${displayMode.label.toLowerCase()} theme`}
              className="justify-center gap-1 px-2 py-2 pr-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:ring-1 data-[state=checked]:ring-accent-foreground/25 data-[state=checked]:focus-visible:ring-2 data-[state=checked]:focus-visible:ring-ring [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              <displayMode.icon />
              <span>{displayMode.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <div className="md:hidden">
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            {workspaceMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.to}
                asChild
                className={
                  isRouteActive(currentPath, item.to, item.exact)
                    ? activeDropdownItemClass
                    : undefined
                }
              >
                <Link to={item.to}>
                  <item.icon />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>

        {administrationMenuItems.length > 0 || showUserManagement ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Administration</DropdownMenuLabel>
              {administrationMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  asChild
                  className={
                    isRouteActive(currentPath, item.to, item.exact)
                      ? activeDropdownItemClass
                      : undefined
                  }
                >
                  <Link to={item.to}>
                    <item.icon />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {showUserManagement ? (
                <DropdownMenuItem
                  asChild
                  className={
                    isRouteActive(currentPath, '/phaeno-users', true)
                      ? activeDropdownItemClass
                      : undefined
                  }
                >
                  <Link to="/phaeno-users">
                    <UsersRound />
                    User management
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          </>
        ) : null}

        {resourceMenuItems.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Resources</DropdownMenuLabel>
              {resourceMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  asChild
                  className={
                    isRouteActive(currentPath, item.to, item.exact)
                      ? activeDropdownItemClass
                      : undefined
                  }
                >
                  <Link to={item.to}>
                    <item.icon />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        {authProvider === 'clerk' ? (
          <SignOutButton redirectUrl="/">
            <DropdownMenuItem variant="destructive">
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </SignOutButton>
        ) : (
          <DropdownMenuItem variant="destructive">
            <LogOut />
            End mock session
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const activeDropdownItemClass = 'bg-secondary text-foreground [&_svg]:text-foreground'

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'U'
}

function isRouteActive(pathname: string, to: string, exact?: boolean) {
  if (exact) {
    return pathname === to
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}
