import { AccountsDashboardContent } from './AccountsDashboardContent'
import { DashboardPanelSelector } from './DashboardPanelSelector'
import { DashboardHero } from './DashboardHero'
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

  return (
    <main className="page-wrap px-4 py-8">
      <div className="soft-enter">
        <DashboardHero />
      </div>
      {selectedMembership?.organizationKind === 'Phaeno' ? (
        <DashboardPanelSelector />
      ) : (
        <div className="soft-enter soft-enter-delay-1">
          <AccountsDashboardContent />
        </div>
      )}
    </main>
  )
}
