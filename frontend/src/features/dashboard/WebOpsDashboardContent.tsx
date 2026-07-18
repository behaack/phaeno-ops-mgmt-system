import { FileText, Mail, RefreshCw, Send } from 'lucide-react'

import type { WebOpsDashboard } from '#/api/web-ops'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

type WebOpsDashboardContentProps = {
  data?: WebOpsDashboard
  error: unknown
  isLoading: boolean
  isMockData?: boolean
  onRetry: () => void
}

export function WebOpsDashboardContent({
  data,
  error,
  isLoading,
  isMockData = false,
  onRetry,
}: WebOpsDashboardContentProps) {
  return (
    <section aria-labelledby="web-ops-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="web-ops-heading" className="text-lg font-semibold">
            Web Operations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review mailing-list signups and demo requests received from the
            public Website.
          </p>
        </div>
        <Badge variant="outline">
          {isMockData ? 'Mock data' : 'Read-only intake'}
        </Badge>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Web Operations intake could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Refresh after confirming the POMS API is available.</span>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading && !data ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading Web Operations intake…
        </p>
      ) : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail aria-hidden="true" className="size-4" />
                    Mailing List
                  </CardTitle>
                  <CardDescription>
                    Newest public signups, including technical-brief requests.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {data.mailingListCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.mailingListContacts.length ? (
                <>
                  <ul className="divide-y">
                    {data.mailingListContacts.map((contact) => (
                      <li
                        key={contact.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {contact.organizationName}
                          </p>
                          <a
                            href={`mailto:${contact.email}`}
                            className="mt-1 block break-all text-sm text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                          {contact.technicalBriefRequested ? (
                            <Badge variant="outline" className="gap-1">
                              <FileText aria-hidden="true" className="size-3" />
                              Technical brief
                            </Badge>
                          ) : null}
                          <time
                            dateTime={contact.createdAtUtc}
                            className="text-xs text-muted-foreground"
                          >
                            {formatDateTime(contact.createdAtUtc)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <SummaryFooter
                    shown={data.mailingListContacts.length}
                    total={data.mailingListCount}
                    label="signups"
                  />
                </>
              ) : (
                <EmptyState message="No mailing-list signups have been recorded." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Send aria-hidden="true" className="size-4" />
                    Demo Requests
                  </CardTitle>
                  <CardDescription>
                    Public inquiries ordered by organization for quick review.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {data.demoRequestCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.demoRequests.length ? (
                <>
                  <ul className="divide-y">
                    {data.demoRequests.map((request) => (
                      <li
                        key={request.id}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div>
                            <p className="font-medium">
                              {request.organizationName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.firstName} {request.lastName}
                            </p>
                          </div>
                          <a
                            href={`mailto:${request.email}`}
                            className="break-all text-sm text-primary hover:underline sm:text-right"
                          >
                            {request.email}
                          </a>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                          {request.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <SummaryFooter
                    shown={data.demoRequests.length}
                    total={data.demoRequestCount}
                    label="requests"
                  />
                </>
              ) : (
                <EmptyState message="No demo requests have been recorded." />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}

function SummaryFooter({
  shown,
  total,
  label,
}: {
  shown: number
  total: number
  label: string
}) {
  if (shown >= total) return null

  return (
    <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
      Showing {shown} of {total} {label}.
    </p>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
