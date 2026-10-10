import { SignOutButton } from '@clerk/react'
import { Link } from '@tanstack/react-router'
import { Building2, ChevronDown, Ellipsis, LogOut, Menu, Monitor, Moon, Settings, Sun, UsersRound, X } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useState } from 'react'

import { getVisibleMainMenuItems, isMainMenuRouteActive } from './navigation'
import { type ThemeMode } from './theme-mode'
import { type SessionDepartment, type SessionMembership, type SessionUser } from '#/api/session'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Field } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

type NavigationItems = ReturnType<typeof getVisibleMainMenuItems>
type MobileUserMenuProps = {
  user?: SessionUser | null
  authProvider: 'clerk' | 'mock' | 'none'
  mode: ThemeMode
  onModeChange: (mode: ThemeMode) => void
  currentPath: string
  workspaceItems: NavigationItems
  moreItems: NavigationItems
  settingsItems: NavigationItems
  resourceItems: NavigationItems
  showUserManagement: boolean
  memberships?: SessionMembership[]
  selectedOrganizationId?: string | null
  onOrganizationChange?: (organizationId: string) => void
  departments?: SessionDepartment[]
  selectedDepartmentId?: string | null
  onDepartmentChange?: (departmentId: string) => void
}

const themeChoices = [
  { label: 'System', value: 'auto', icon: Monitor },
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
] as const

const navigationRowClass = 'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
const activeNavigationClass = 'bg-secondary text-foreground'

export function MobileUserMenu({
  user, authProvider, mode, onModeChange, currentPath,
  workspaceItems, moreItems, settingsItems, resourceItems,
  showUserManagement, departments, selectedDepartmentId, onDepartmentChange,
  memberships, selectedOrganizationId, onOrganizationChange,
}: MobileUserMenuProps) {
  const [open, setOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<'more' | 'settings' | null>(null)
  const themeGroupId = useId()
  const departmentId = useId()

  useEffect(() => {
    const viewport = window.matchMedia('(min-width: 1024px)')
    const closeOnLayoutChange = () => {
      setOpen(false)
      setExpandedSection(null)
    }
    viewport.addEventListener('change', closeOnLayoutChange)
    return () => viewport.removeEventListener('change', closeOnLayoutChange)
  }, [])

  const close = () => {
    setOpen(false)
    setExpandedSection(null)
  }
  const initials = `${user?.firstName.trim().charAt(0) ?? ''}${user?.lastName.trim().charAt(0) ?? ''}`.toUpperCase() || 'U'

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      setOpen(nextOpen)
      if (!nextOpen) setExpandedSection(null)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-11 lg:hidden" aria-label="Open user menu">
          <Menu aria-hidden="true" className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="inset-0 top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 duration-200 data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 motion-reduce:animate-none [&_[data-slot=dialog-body]]:block [&_[data-slot=dialog-body]]:pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] pr-4">
          <DialogTitle>Menu</DialogTitle>
          <DialogDescription className="sr-only">Account preferences and navigation.</DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" className="min-h-11" aria-label="Close user menu">
              <X aria-hidden="true" />
              Close
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-3 px-3 py-2">
            <Avatar size="lg" aria-hidden="true">
              <AvatarFallback className="bg-secondary font-semibold text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-base font-semibold break-words">{user ? `${user.firstName} ${user.lastName}` : 'Signed in'}</p>
              <p className="text-sm break-all text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <fieldset className="grid grid-cols-3 gap-1 rounded-lg bg-muted/70 p-1">
            <legend className="sr-only">Display theme</legend>
            {themeChoices.map(choice => (
              <label key={choice.value} className={cn('flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-inset', mode === choice.value && 'bg-background font-semibold shadow-sm ring-1 ring-border')}>
                <input type="radio" name={themeGroupId} value={choice.value} checked={mode === choice.value} onChange={() => onModeChange(choice.value)} aria-label={`Use ${choice.label.toLowerCase()} theme`} className="sr-only" />
                <choice.icon aria-hidden="true" className="size-4" />
                {choice.label}
              </label>
            ))}
          </fieldset>
          {(memberships?.length ?? 0) > 1 ? (
            <div className="flex items-center gap-2 border-t border-border px-3 pt-3">
              <Building2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <NativeSelect aria-label="Organization" value={selectedOrganizationId ?? ''} onChange={event => { close(); onOrganizationChange?.(event.target.value) }}>
                {memberships?.map(membership => <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>)}
              </NativeSelect>
            </div>
          ) : null}
          {(departments?.length ?? 0) > 1 ? (
            <Field className="border-t border-border pt-3">
              <Label htmlFor={departmentId}>Department</Label>
              <NativeSelect id={departmentId} value={selectedDepartmentId ?? ''} onChange={event => onDepartmentChange?.(event.target.value)}>
                {departments?.map(department => <option key={department.departmentId} value={department.departmentId}>{department.departmentName}{department.isDepartmentAdmin ? ' · Admin' : ''}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          <nav aria-label="Mobile navigation" data-mobile-navigation className="border-t border-border pt-3">
            <MobileNavigationLinks items={workspaceItems} currentPath={currentPath} onNavigate={close} />
            {moreItems.length > 0 ? (
              <MobileNavigationSection label="More" icon={Ellipsis} items={moreItems} currentPath={currentPath} expanded={expandedSection === 'more'} onToggle={() => setExpandedSection(section => section === 'more' ? null : 'more')} onNavigate={close} />
            ) : null}
            {settingsItems.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <MobileNavigationSection label="Settings" icon={Settings} items={settingsItems} currentPath={currentPath} expanded={expandedSection === 'settings'} onToggle={() => setExpandedSection(section => section === 'settings' ? null : 'settings')} onNavigate={close} />
              </div>
            ) : null}
            {resourceItems.length > 0 || showUserManagement ? (
              <div className="mt-3 border-t border-border pt-3">
                <MobileNavigationLinks items={resourceItems} currentPath={currentPath} onNavigate={close} />
                {showUserManagement ? <Link to="/phaeno-users" onKeyDown={moveNavigationFocus} onClick={close} aria-current={currentPath === '/phaeno-users' ? 'page' : undefined} className={cn(navigationRowClass, currentPath === '/phaeno-users' && activeNavigationClass)}><UsersRound aria-hidden="true" className="size-4 shrink-0" />User management</Link> : null}
              </div>
            ) : null}
          </nav>
          <div className="border-t border-border pt-3">
            {authProvider === 'clerk' ? (
              <SignOutButton redirectUrl="/"><button type="button" className={navigationRowClass}><LogOut aria-hidden="true" className="size-4" />Sign out</button></SignOutButton>
            ) : <button type="button" className={navigationRowClass}><LogOut aria-hidden="true" className="size-4" />End mock session</button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MobileNavigationLinks({ items, currentPath, onNavigate, nested = false }: { items: NavigationItems; currentPath: string; onNavigate: () => void; nested?: boolean }) {
  return items.map(item => {
    const active = isMainMenuRouteActive(currentPath, item.to, item.exact)
    return (
      <Link
        key={item.to}
        to={item.to}
        onKeyDown={moveNavigationFocus}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(navigationRowClass, nested && 'rounded-md', active && activeNavigationClass)}
      >
        {nested ? null : <item.icon aria-hidden="true" className="size-4 shrink-0" />}
        {item.label}
      </Link>
    )
  })
}

function MobileNavigationSection({ label, icon: Icon, items, currentPath, expanded, onToggle, onNavigate }: {
  label: string; icon: typeof Menu; items: NavigationItems; currentPath: string; expanded: boolean; onToggle: () => void; onNavigate: () => void
}) {
  const sectionId = useId()
  const active = items.some(item => isMainMenuRouteActive(currentPath, item.to, item.exact))
  return (
    <>
      <button type="button" onKeyDown={moveNavigationFocus} aria-expanded={expanded} aria-controls={expanded ? sectionId : undefined} className={cn(navigationRowClass, 'font-medium', expanded && 'hover:bg-transparent', active && !expanded && 'text-primary')} onClick={event => { event.currentTarget.focus(); onToggle() }}>
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {label}
        <ChevronDown aria-hidden="true" className={cn('ml-auto size-4', expanded && 'rotate-180')} />
      </button>
      {expanded ? (
        <div id={sectionId} role="group" aria-label={label} className="mt-1 mb-1 ml-5 border-l border-border pl-3">
          <MobileNavigationLinks items={items} currentPath={currentPath} onNavigate={onNavigate} nested />
        </div>
      ) : null}
    </>
  )
}

function moveNavigationFocus(event: KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const nav = event.currentTarget.closest('[data-mobile-navigation]')
  if (!nav) return
  const items = Array.from(nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(item => item.getClientRects().length > 0)
  const current = items.indexOf(event.currentTarget)
  if (current < 0) return
  event.preventDefault()
  items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
}
