import { AccessOperationsCard } from './AccessOperationsCard'
import { DashboardHero } from './DashboardHero'
import { InvitePanel } from './InvitePanel'
import { MetricsGrid } from './MetricsGrid'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

export function DashboardPage() {
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const canInviteUsers = Boolean(
    session?.capabilities.canInviteUsers && selectedMembership,
  )

  return (
    <main className="page-wrap px-4 py-8">
      <div className="soft-enter">
        <DashboardHero />
      </div>
      <div className="soft-enter soft-enter-delay-1">
        <MetricsGrid />
      </div>
      <section
        className={
          canInviteUsers
            ? 'soft-enter soft-enter-delay-2 mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]'
            : 'soft-enter soft-enter-delay-2 mt-6 grid gap-4'
        }
      >
        <AccessOperationsCard />
        {canInviteUsers ? <InvitePanel /> : null}
      </section>
    </main>
  )
}
