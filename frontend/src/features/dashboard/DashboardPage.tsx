import { AccessOperationsCard } from './AccessOperationsCard'
import { DashboardHero } from './DashboardHero'
import { InvitePanel } from './InvitePanel'
import { MetricsGrid } from './MetricsGrid'

export function DashboardPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="soft-enter">
        <DashboardHero />
      </div>
      <div className="soft-enter soft-enter-delay-1">
        <MetricsGrid />
      </div>
      <section className="soft-enter soft-enter-delay-2 mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <AccessOperationsCard />
        <InvitePanel />
      </section>
    </main>
  )
}
