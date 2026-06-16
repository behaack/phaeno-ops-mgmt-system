import { organizationHealth } from './dashboard-data'
import { Badge } from '#/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export function OrganizationHealthPanel() {
  return (
    <Card className="surface-motion">
      <CardHeader>
        <CardTitle>Organization health</CardTitle>
        <CardDescription>
          Mock tenant readiness signals for the operations dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {organizationHealth.map((organization) => (
          <div
            key={organization.name}
            className="rounded-lg border bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 truncate font-medium">{organization.name}</p>
                <p className="m-0 text-xs text-muted-foreground">
                  {organization.type} - {organization.users} users -{' '}
                  {organization.owner}
                </p>
              </div>
              <Badge
                variant={organization.status === 'Ready' ? 'secondary' : 'outline'}
              >
                {organization.status}
              </Badge>
            </div>
            <p className="m-0 mt-3 text-sm text-muted-foreground">
              {organization.review}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
