import { Link } from '@tanstack/react-router'

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
    <header className="sticky top-0 z-50 border-b bg-background/90 px-2 backdrop-blur md:px-4">
      <nav className="page-wrap relative flex min-h-[5.25rem] flex-wrap items-center gap-x-3 gap-y-2 py-3 md:flex-nowrap">
        <div className="m-0 flex-shrink-0 text-base font-semibold">
          <Link
            to="/"
            className="inline-flex flex-col items-start gap-0.5 px-0 py-1 no-underline md:px-3"
            aria-label={`${branding.name} home`}
            title={branding.fullName}
          >
            <img
              src="/phaeno124x40.webp"
              alt="Phaeno"
              width={124}
              height={40}
              className="h-9 w-[112px] object-contain md:h-10 md:w-[124px]"
            />
            <span className="text-[0.5625rem] font-semibold tracking-[0.32em] text-foreground uppercase md:text-[0.625rem]">
              {branding.name}
            </span>
          </Link>
        </div>

        <MainMenu />

        <div className="ml-auto md:ml-0">
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
