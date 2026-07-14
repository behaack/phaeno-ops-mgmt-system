import { Link } from '@tanstack/react-router'

import { MainMenu } from './MainMenu'
import { UserMenu } from './UserMenu'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'
import { useMockAdminData } from '#/features/admin/mock-admin-data'
import { isExternalOrganizationKind } from './navigation'

export default function Header() {
  const { signedIn, session, selectedOrganizationId } = usePhaenoSession()
  const { customers } = useMockAdminData()
  const selectedMembership = getSelectedMembership(session, selectedOrganizationId)
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedOrganizationId,
  )
  const impersonatedCustomer =
    signedIn && selectedCustomer
      ? selectedCustomer
      : signedIn && isExternalOrganizationKind(selectedMembership?.organizationKind)
        ? selectedMembership
      : null

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 px-2 backdrop-blur md:px-4">
      <nav className="page-wrap relative flex min-h-[5.25rem] items-center gap-3 py-3">
        <div className="m-0 flex-shrink-0 text-base font-semibold">
          <Link
            to="/"
            className="inline-flex flex-col items-start gap-0.5 px-0 py-1 no-underline md:px-3"
            aria-label="Phaeno Portal home"
          >
            <img
              src="/phaeno124x40.webp"
              alt="Phaeno"
              width={124}
              height={40}
              className="h-9 w-[112px] object-contain md:h-10 md:w-[124px]"
            />
            <span className="text-[0.5625rem] font-semibold tracking-[0.32em] text-foreground uppercase md:text-[0.625rem]">
              Portal
            </span>
          </Link>
        </div>

        <MainMenu />

        <div className="ml-auto md:ml-0">
          <UserMenu />
        </div>
        {impersonatedCustomer ? (
          <div className="absolute right-1/2 bottom-2 flex max-w-[calc(100%-1rem)] translate-x-1/2 items-center justify-center gap-1 text-center text-[0.6875rem] text-muted-foreground md:right-12 md:max-w-[min(24rem,calc(100%-4rem))] md:translate-x-0 md:justify-start md:text-left">
            <span className="shrink-0 font-medium">Acting as:</span>
            <span className="min-w-0 truncate font-medium text-foreground/80">
              {selectedCustomer?.name ?? selectedMembership?.organizationName}
            </span>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
