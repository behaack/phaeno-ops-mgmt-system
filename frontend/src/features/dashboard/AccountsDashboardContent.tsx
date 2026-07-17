import { AccessOperationsCard } from './AccessOperationsCard'
import { ActivityFeedPanel } from './ActivityFeedPanel'
import { InvitePanel } from './InvitePanel'
import { MetricsGrid } from './MetricsGrid'
import { OrganizationHealthPanel } from './OrganizationHealthPanel'
import { Badge } from '#/components/ui/badge'

export function AccountsDashboardContent({
  showHeading = false,
}: {
  showHeading?: boolean
}) {
  return (
    <div className="space-y-4">
      {showHeading ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Customer, Partner &amp; Prospect Accounts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review organization readiness, access, invitations, and account
              activity.
            </p>
          </div>
          <Badge variant="outline">Mock data</Badge>
        </div>
      ) : null}
      <MetricsGrid />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <AccessOperationsCard />
        <InvitePanel />
      </section>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <OrganizationHealthPanel />
        <ActivityFeedPanel />
      </section>
    </div>
  )
}
