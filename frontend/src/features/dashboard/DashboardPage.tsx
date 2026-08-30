import { DashboardPanelSelector } from './DashboardPanelSelector'
import { DashboardHero } from './DashboardHero'
import { ExternalDashboardContent } from './ExternalDashboardContent'
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

  if (selectedMembership?.organizationKind === 'Phaeno') {
    return <DashboardPanelSelector />
  }

  return (
    <main className="page-wrap px-4 py-8">
      <div className="soft-enter">
        <DashboardHero />
      </div>
      <div className="soft-enter soft-enter-delay-1">
        <ExternalDashboardContent membership={selectedMembership} />
      </div>
    </main>
  )
}
