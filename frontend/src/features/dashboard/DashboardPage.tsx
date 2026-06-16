import { AccessOperationsCard } from './AccessOperationsCard'
import { ActivityFeedPanel } from './ActivityFeedPanel'
import { DashboardHero } from './DashboardHero'
import { InvitePanel } from './InvitePanel'
import { MetricsGrid } from './MetricsGrid'
import { OrganizationHealthPanel } from './OrganizationHealthPanel'

export function DashboardPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="soft-enter">
        <DashboardHero />
      </div>
      <div className="soft-enter soft-enter-delay-1">
        <MetricsGrid />
      </div>
      <section
        className="soft-enter soft-enter-delay-2 mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <AccessOperationsCard />
        <InvitePanel />
      </section>
      <section className="soft-enter soft-enter-delay-2 mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <OrganizationHealthPanel />
        <ActivityFeedPanel />
      </section>
    </main>
  )
}
