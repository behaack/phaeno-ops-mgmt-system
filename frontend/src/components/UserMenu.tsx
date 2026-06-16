import { Link, useRouterState } from '@tanstack/react-router'
import { SignOutButton } from '@clerk/react'
import { useEffect, useId, useMemo, useState } from 'react'
import {
  Bell,
  Check,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
  Sun,
  UsersRound,
  UserCircle,
} from 'lucide-react'

import {
  canManagePhaenoUsers,
  getVisibleMainMenuItems,
  isPhaenoEmployee,
} from './navigation'
import { type ThemeMode, useThemeMode } from './theme-mode'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Input } from '#/components/ui/input'
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
import type { SessionMembership, SessionResponse } from '#/api/session'
import { cn } from '#/lib/utils'

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
  const [organizationQuery, setOrganizationQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0)
  const customerOptionsId = useId()
  const {
    authProvider,
    signedIn,
    session,
    selectedOrganizationId,
    setSelectedOrganizationId,
  } = usePhaenoSession()
  const user = session?.user
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const visibleMenuItems = getVisibleMainMenuItems(session, {
    selectedMembership,
  })
  const showPhaenoUserManagement = canManagePhaenoUsers(session)
  const canImpersonateCustomers =
    isPhaenoEmployee(session) &&
    Boolean(session?.capabilities.canManageOrganizations)
  const phaenoMembership = getPhaenoMembership(session)
  const customerImpersonationMemberships = useMemo(
    () => getCustomerImpersonationMemberships(session),
    [session],
  )
  const fallbackMembership =
    selectedMembership ?? phaenoMembership ?? session?.memberships[0] ?? null
  const currentCustomerImpersonation =
    canImpersonateCustomers && selectedMembership?.organizationKind === 'Customer'
      ? selectedMembership
      : null
  const customerResults = useMemo(
    () =>
      filterOrganizationMemberships(
        customerImpersonationMemberships,
        organizationQuery,
      ),
    [customerImpersonationMemberships, organizationQuery],
  )
  const activeCustomer = customerResults[activeCustomerIndex] ?? null
  const showCustomerImpersonation =
    canImpersonateCustomers && customerImpersonationMemberships.length > 0

  useEffect(() => {
    if (!customerDropdownOpen) {
      return
    }

    setActiveCustomerIndex((currentIndex) => {
      if (customerResults.length === 0) {
        return 0
      }

      return Math.min(currentIndex, customerResults.length - 1)
    })
  }, [customerDropdownOpen, customerResults.length])

  if (!signedIn) {
    return null
  }

  function selectCustomerOrganization(membership: SessionMembership) {
    setSelectedOrganizationId(membership.organizationId)
    setOrganizationQuery('')
    setCustomerDropdownOpen(false)
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-all outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Open user menu"
      >
        <Menu aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
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

        {showCustomerImpersonation ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Customer impersonation</DropdownMenuLabel>
            <div className="space-y-1 px-1.5 py-1">
              {currentCustomerImpersonation ? (
                <div className="px-1 text-sm text-foreground">
                  {currentCustomerImpersonation.organizationName}
                </div>
              ) : null}
              <div className="relative">
                <Input
                  aria-activedescendant={
                    customerDropdownOpen && activeCustomer
                      ? getCustomerOptionId(
                          customerOptionsId,
                          activeCustomer.membershipId,
                        )
                      : undefined
                  }
                  aria-autocomplete="list"
                  aria-controls={customerOptionsId}
                  aria-expanded={customerDropdownOpen}
                  aria-label="Search customers to impersonate"
                  role="combobox"
                  value={organizationQuery}
                  onBlur={() => setCustomerDropdownOpen(false)}
                  onChange={(event) => {
                    setOrganizationQuery(event.target.value)
                    setCustomerDropdownOpen(true)
                    setActiveCustomerIndex(0)
                  }}
                  onFocus={() => {
                    setCustomerDropdownOpen(true)
                    setActiveCustomerIndex(0)
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === 'Escape') {
                      setCustomerDropdownOpen(false)
                      return
                    }

                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      if (!customerDropdownOpen) {
                        setCustomerDropdownOpen(true)
                        setActiveCustomerIndex(0)
                        return
                      }

                      setCustomerDropdownOpen(true)
                      setActiveCustomerIndex((currentIndex) =>
                        customerResults.length === 0 ||
                        currentIndex >= customerResults.length - 1
                          ? 0
                          : currentIndex + 1,
                      )
                      return
                    }

                    if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      if (!customerDropdownOpen) {
                        setCustomerDropdownOpen(true)
                        setActiveCustomerIndex(
                          Math.max(customerResults.length - 1, 0),
                        )
                        return
                      }

                      setCustomerDropdownOpen(true)
                      setActiveCustomerIndex((currentIndex) =>
                        customerResults.length === 0 || currentIndex <= 0
                          ? Math.max(customerResults.length - 1, 0)
                          : currentIndex - 1,
                      )
                      return
                    }

                    if (
                      event.key === 'Enter' &&
                      customerDropdownOpen &&
                      activeCustomer
                    ) {
                      event.preventDefault()
                      selectCustomerOrganization(activeCustomer)
                    }
                  }}
                  placeholder="Search customers..."
                  className="h-8 pr-8"
                />
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                {customerDropdownOpen ? (
                  <div
                    id={customerOptionsId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  >
                    {customerResults.length > 0 ? (
                      customerResults.map((membership, index) => (
                        <button
                          key={membership.membershipId}
                          id={getCustomerOptionId(
                            customerOptionsId,
                            membership.membershipId,
                          )}
                          type="button"
                          role="option"
                          aria-selected={
                            currentCustomerImpersonation?.membershipId ===
                            membership.membershipId
                          }
                          className={cn(
                            'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
                            index === activeCustomerIndex &&
                              'bg-accent text-accent-foreground',
                          )}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveCustomerIndex(index)}
                          onClick={() => selectCustomerOrganization(membership)}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {membership.organizationName}
                          </span>
                          {currentCustomerImpersonation?.membershipId ===
                          membership.membershipId ? (
                            <Check className="ml-2 size-4 shrink-0" />
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No customers found.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              {currentCustomerImpersonation ? (
                <DropdownMenuItem
                  className="pl-2 underline underline-offset-3 hover:no-underline focus-visible:no-underline"
                  onSelect={(event) => {
                    event.preventDefault()
                    setSelectedOrganizationId(
                      phaenoMembership?.organizationId ?? null,
                    )
                    setOrganizationQuery('')
                    setCustomerDropdownOpen(false)
                  }}
                >
                  Return to Phaeno
                </DropdownMenuItem>
              ) : null}
            </div>
          </>
        ) : fallbackMembership ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <div className="px-1.5 py-1 text-sm text-foreground">
              {fallbackMembership.organizationName}
            </div>
          </>
        ) : null}

        <DropdownMenuSeparator className="md:hidden" />
        <DropdownMenuGroup className="md:hidden">
          <DropdownMenuLabel>Main menu</DropdownMenuLabel>
          {visibleMenuItems.map((item) => (
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

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Display</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as ThemeMode)}
        >
          {displayModes.map((displayMode) => (
            <DropdownMenuRadioItem
              key={displayMode.value}
              value={displayMode.value}
            >
              <displayMode.icon />
              {displayMode.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {showPhaenoUserManagement ? (
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
          <DropdownMenuItem>
            <UserCircle />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem>
            <LifeBuoy />
            Support
          </DropdownMenuItem>
        </DropdownMenuGroup>

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

function getPhaenoMembership(session: SessionResponse | null) {
  return (
    session?.memberships.find(
      (membership) => membership.organizationKind === 'Phaeno',
    ) ?? null
  )
}

function getCustomerImpersonationMemberships(session: SessionResponse | null) {
  return (session?.memberships ?? []).filter(
    (membership) => membership.organizationKind === 'Customer',
  )
}

function getCustomerOptionId(optionsId: string, membershipId: string) {
  return `${optionsId}-${membershipId}`
}

function filterOrganizationMemberships(
  memberships: readonly SessionMembership[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return memberships.slice(0, 12)
  }

  return memberships
    .filter((membership) =>
      membership.organizationName.toLocaleLowerCase().includes(normalizedQuery),
    )
    .slice(0, 12)
}
