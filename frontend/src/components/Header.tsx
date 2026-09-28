import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { MainMenu } from './MainMenu'
import { UserMenu } from './UserMenu'
import { useApplicationBranding } from './application-branding'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { useMockAdminData } from '#/features/admin/mock-admin-data'
import { isExternalOrganizationKind } from './navigation'

export default function Header() {
  const headerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const updateHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height)
      if (height > 0) document.documentElement.style.setProperty('--portal-header-height', `${height}px`)
    }
    updateHeight()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateHeight)
    observer?.observe(header)
    return () => {
      observer?.disconnect()
      document.documentElement.style.removeProperty('--portal-header-height')
    }
  }, [])
  const branding = useApplicationBranding()
  const { signedIn, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const { customers } = useMockAdminData()
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedOrganizationId,
  )
  const selectedDepartment = selectedMembership?.departments?.find(
    (department) => department.departmentId === selectedDepartmentId,
  )
  const showOrganizationContext = signedIn && (
    Boolean(selectedCustomer) || isExternalOrganizationKind(selectedMembership?.organizationKind)
  )

  return (
    <header ref={headerRef} data-portal-header className="sticky top-0 z-50 w-full shrink-0 border-b bg-background/90 backdrop-blur lg:px-4">
      <nav className="relative mx-auto flex min-h-18 w-full flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2 md:flex-nowrap lg:min-h-[5.25rem] lg:w-[min(1180px,calc(100%-2rem))] lg:px-0 lg:py-3">
        <div className="m-0 flex shrink-0 text-base font-semibold lg:block">
          <Link
            to="/"
            className="flex flex-col items-start gap-0.5 no-underline lg:inline-flex lg:px-3 lg:py-1"
            aria-label={`${branding.name} home`}
            title={branding.fullName}
          >
            <img
              src="/phaeno124x40.webp"
              alt="Phaeno"
              width={124}
              height={40}
              className="h-9 w-[112px] object-contain lg:h-10 lg:w-[124px]"
            />
            <span className="text-[0.5625rem] leading-none font-semibold tracking-[0.32em] text-foreground uppercase lg:text-[0.625rem] lg:leading-normal">
              {branding.name}
            </span>
          </Link>
        </div>

        <MainMenu />

        <div className="ml-auto lg:ml-0">
          <UserMenu />
        </div>
        {showOrganizationContext ? (
          <div className="flex w-full items-start gap-1.5 border-t pt-2 text-xs leading-5 text-muted-foreground md:absolute md:right-12 md:bottom-2 md:w-auto md:max-w-[min(24rem,calc(100%-4rem))] md:items-center md:border-0 md:pt-0 md:text-[0.6875rem] md:leading-normal">
            <span className="shrink-0 font-medium">Organization:</span>
            <span className="min-w-0 font-medium break-words text-foreground/80 md:truncate">
              {selectedCustomer?.name ?? selectedMembership?.organizationName}
              {selectedDepartment ? ` · ${selectedDepartment.departmentName}` : ''}
            </span>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
