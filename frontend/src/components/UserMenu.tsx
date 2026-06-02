import { Link } from '@tanstack/react-router'
import { SignInButton, SignOutButton } from '@clerk/react'
import {
  Bell,
  Check,
  ChevronDown,
  LifeBuoy,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  UserCircle,
} from 'lucide-react'

import { mainMenuItems } from './navigation'
import { type ThemeMode, useThemeMode } from './theme-mode'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
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
  const {
    authConfigured,
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

  if (!signedIn) {
    if (!authConfigured) {
      return (
        <Button type="button" variant="outline" size="sm" disabled>
          <LogIn aria-hidden="true" />
          Sign in
        </Button>
      )
    }

    return (
      <SignInButton mode="modal">
        <Button type="button" variant="outline" size="sm">
          <LogIn aria-hidden="true" />
          Sign in
        </Button>
      </SignInButton>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-2 text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:px-2.5"
        aria-label="Open user menu"
      >
        <Avatar size="sm">
          <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">
          {user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
        </span>
        <ChevronDown aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">
            {user ? `${user.firstName} ${user.lastName}` : 'Signed in'}
          </span>
          <span className="block truncate text-xs">{user?.email}</span>
        </DropdownMenuLabel>

        {session?.memberships.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organization</DropdownMenuLabel>
            <DropdownMenuGroup>
              {session.memberships.map((membership) => (
                <DropdownMenuItem
                  key={membership.membershipId}
                  onSelect={() =>
                    setSelectedOrganizationId(membership.organizationId)
                  }
                >
                  <Check
                    className={
                      selectedMembership?.membershipId === membership.membershipId
                        ? 'opacity-100'
                        : 'opacity-0'
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {membership.organizationName}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator className="md:hidden" />
        <DropdownMenuGroup className="md:hidden">
          <DropdownMenuLabel>Main menu</DropdownMenuLabel>
          {mainMenuItems.map((item) => (
            <DropdownMenuItem key={item.to} asChild>
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
        <SignOutButton redirectUrl="/">
          <DropdownMenuItem variant="destructive">
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'U'
}
