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
  isMainMenuRouteActive,
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
    selectedDepartmentId,
    setSelectedDepartmentId,
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
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-all outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Open user menu"
      >
        <Menu aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-80 max-w-[calc(100vw-1rem)] rounded-xl p-2 shadow-lg [&_[data-slot=dropdown-menu-item]]:min-h-10 [&_[data-slot=dropdown-menu-item]]:gap-2.5 [&_[data-slot=dropdown-menu-item]]:px-3"
      >
        <DropdownMenuLabel className="px-3 py-3 font-normal">
          <span className="flex min-w-0 items-center gap-3">
            <Avatar size="lg" aria-hidden="true">
              <AvatarFallback className="bg-secondary font-semibold text-foreground">
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block text-base leading-6 font-semibold break-words text-foreground">
                {user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
              </span>
              <span className="mt-0.5 block text-sm leading-5 break-all text-muted-foreground">{user?.email}</span>
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="mx-1 my-2" />
        <DropdownMenuLabel className="px-3 pb-2">Display</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as ThemeMode)}
          aria-label="Display theme"
          className="mx-2 mb-2 grid grid-cols-3 gap-1 rounded-lg bg-muted/70 p-1"
        >
          {displayModes.map((displayMode) => (
            <DropdownMenuRadioItem
              key={displayMode.value}
              value={displayMode.value}
              aria-label={`Use ${displayMode.label.toLowerCase()} theme`}
              className="min-h-10 justify-center gap-1.5 px-2 py-2 pr-2 text-xs focus:bg-background focus:text-foreground focus:**:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=checked]:bg-background data-[state=checked]:font-semibold data-[state=checked]:text-foreground data-[state=checked]:shadow-sm data-[state=checked]:ring-1 data-[state=checked]:ring-border data-[state=checked]:focus-visible:ring-2 data-[state=checked]:focus-visible:ring-ring [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              <displayMode.icon aria-hidden="true" />
              <span>{displayMode.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {(selectedMembership?.departments?.length ?? 0) > 1 ? (
          <>
            <DropdownMenuSeparator className="mx-1 my-2" />
            <DropdownMenuLabel className="px-3 pb-2">Department</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedDepartmentId ?? ''}
              onValueChange={(value) => setSelectedDepartmentId?.(value)}
            >
              {selectedMembership?.departments?.map((department) => (
                <DropdownMenuRadioItem
                  key={department.departmentId}
                  value={department.departmentId}
                  className="min-h-10 px-3 pr-8"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {department.departmentName}
                  </span>
                  {department.isDepartmentAdmin ? (
                    <span className="text-xs text-muted-foreground">Admin</span>
                  ) : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        ) : null}

        <div className="md:hidden">
          <DropdownMenuSeparator className="mx-1 my-2" />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 pb-2">Workspace</DropdownMenuLabel>
            {workspaceMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.to}
                asChild
                className={
                  isMainMenuRouteActive(currentPath, item.to, item.exact)
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
            <DropdownMenuSeparator className="mx-1 my-2" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 pb-2">Administration</DropdownMenuLabel>
              {administrationMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  asChild
                  className={
                    isMainMenuRouteActive(currentPath, item.to, item.exact)
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
                    isMainMenuRouteActive(currentPath, '/phaeno-users', true)
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
            <DropdownMenuSeparator className="mx-1 my-2" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 pb-2">Resources</DropdownMenuLabel>
              {resourceMenuItems.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  asChild
                  className={
                    isMainMenuRouteActive(currentPath, item.to, item.exact)
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

        <DropdownMenuSeparator className="mx-1 my-2" />
        {authProvider === 'clerk' ? (
          <SignOutButton redirectUrl="/">
            <DropdownMenuItem>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </SignOutButton>
        ) : (
          <DropdownMenuItem>
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
