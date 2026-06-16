import { activityFeed } from './dashboard-data'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export function ActivityFeedPanel() {
  return (
    <Card className="surface-motion">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Representative account and access events for UI review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activityFeed.map((event) => (
          <div key={`${event.actor}-${event.time}`} className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <event.icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm leading-6">
                <span className="font-medium">{event.actor}</span>{' '}
                {event.action}
              </p>
              <p className="m-0 truncate text-xs text-muted-foreground">
                {event.target} - {event.time}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
