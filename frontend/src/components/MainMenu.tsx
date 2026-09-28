import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getVisibleMainMenuItems, isMainMenuRouteActive } from './navigation'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { useMockAdminData } from '#/features/admin/mock-admin-data'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

export function MainMenu() {
  const { signedIn, session, selectedOrganizationId } = usePhaenoSession()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const { customers } = useMockAdminData()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreTriggerRef = useRef<HTMLButtonElement>(null)
  const moreCloseFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const viewport = window.matchMedia('(min-width: 1024px)')
    const closeOnNarrowLayout = (event: MediaQueryListEvent) => {
      if (!event.matches) setMoreOpen(false)
    }
    viewport.addEventListener('change', closeOnNarrowLayout)
    return () => viewport.removeEventListener('change', closeOnNarrowLayout)
  }, [])

  if (!signedIn) {
    return null
  }

  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const selectedOrganizationKind =
    selectedMembership?.organizationKind ??
    (customers.some((customer) => customer.id === selectedOrganizationId)
      ? 'Customer'
      : null)
  const navigationContext = { selectedOrganizationKind, selectedMembership }
  const visibleMenuItems = getVisibleMainMenuItems(session, navigationContext, 'workspace')
  const moreMenuItems = getVisibleMainMenuItems(session, navigationContext, 'more')
  const isMoreActive = moreMenuItems.some(item => isMainMenuRouteActive(pathname, item.to, item.exact))

  return (
    <div className="hidden items-center gap-2 text-sm font-medium lg:ml-auto lg:flex">
      {visibleMenuItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`nav-link whitespace-nowrap${isMainMenuRouteActive(pathname, item.to, item.exact) ? ' is-active' : ''}`}
          aria-current={isMainMenuRouteActive(pathname, item.to, item.exact) ? 'page' : undefined}
          activeProps={{ className: 'nav-link is-active' }}
          activeOptions={item.exact ? { exact: true } : undefined}
        >
          <item.icon className="size-3.5" />
          {item.label}
        </Link>
      ))}
      {moreMenuItems.length > 0 ? (
        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger
            ref={moreTriggerRef}
            className={`nav-link cursor-pointer whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50${isMoreActive ? ' is-active' : ''}`}
            aria-label="More workspaces"
          >
            More
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </DropdownMenuTrigger>
          {moreOpen ? (
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              collisionPadding={8}
              className="w-60 rounded-xl p-2 shadow-lg"
              onEscapeKeyDown={event => {
                event.preventDefault()
                moreCloseFocusRef.current = null
                setMoreOpen(false)
              }}
              onKeyDown={event => {
                if (event.key !== 'Tab') return
                event.preventDefault()
                const trigger = moreTriggerRef.current
                const toolbarItems = Array.from(trigger?.closest('nav')?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]') ?? [])
                  .filter(item => item.tabIndex >= 0 && item.getClientRects().length > 0)
                const next = toolbarItems.indexOf(trigger as HTMLElement) + (event.shiftKey ? -1 : 1)
                moreCloseFocusRef.current = toolbarItems[next] ?? trigger
                setMoreOpen(false)
              }}
              onCloseAutoFocus={event => {
                event.preventDefault()
                const target = moreCloseFocusRef.current ?? moreTriggerRef.current
                moreCloseFocusRef.current = null
                target?.focus()
              }}
            >
              {moreMenuItems.map(item => (
                <DropdownMenuItem
                  key={item.to}
                  asChild
                  className={`min-h-10 gap-2.5 px-3${isMainMenuRouteActive(pathname, item.to, item.exact) ? ' bg-secondary text-foreground [&_svg]:text-foreground' : ''}`}
                >
                  <Link to={item.to} aria-current={isMainMenuRouteActive(pathname, item.to, item.exact) ? 'page' : undefined}>
                    <item.icon aria-hidden="true" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          ) : null}
        </DropdownMenu>
      ) : null}
    </div>
  )
}
