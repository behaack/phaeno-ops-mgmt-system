import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react'

import type {
  WebOpsDemoRequest,
  WebOpsMailingListContact,
  WebOpsPage,
} from '#/api/web-ops'
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

type WebOpsPanelState<T> = {
  data?: WebOpsPage<T>
  error: unknown
  isLoading: boolean
  onPageChange: (page: number) => void
  onRetry: () => void
}

type WebOpsDashboardContentProps = {
  mailingList: WebOpsPanelState<WebOpsMailingListContact>
  demoRequests: WebOpsPanelState<WebOpsDemoRequest>
  isMockData?: boolean
}

export function WebOpsDashboardContent({
  mailingList,
  demoRequests,
  isMockData = false,
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          role="region"
          aria-labelledby="mailing-list-heading"
          aria-busy={mailingList.isLoading}
        >
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  <h3
                    id="mailing-list-heading"
                    className="flex items-center gap-2"
                  >
                    <Mail aria-hidden="true" className="size-4" />
                    Mailing List
                  </h3>
                </CardTitle>
                <CardDescription>
                  Newest public signups, including technical-brief requests.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {mailingList.data?.totalCount ?? 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PanelError
              error={mailingList.error}
              label="Mailing List"
              onRetry={mailingList.onRetry}
            />
            {mailingList.isLoading && !mailingList.data ? (
              <PanelLoading label="Mailing List" />
            ) : null}
            {mailingList.data ? (
              mailingList.data.items.length ? (
                <>
                  <ul className="divide-y">
                    {mailingList.data.items.map((contact) => (
                      <li
                        key={contact.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
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
                  <PanelPagination
                    itemCount={mailingList.data.items.length}
                    label="signups"
                    panelLabel="Mailing List"
                    page={mailingList.data.page}
                    pageSize={mailingList.data.pageSize}
                    totalCount={mailingList.data.totalCount}
                    disabled={mailingList.isLoading}
                    onPageChange={mailingList.onPageChange}
                  />
                </>
              ) : (
                <EmptyState message="No mailing-list signups have been recorded." />
              )
            ) : null}
          </CardContent>
        </Card>

        <Card
          role="region"
          aria-labelledby="demo-requests-heading"
          aria-busy={demoRequests.isLoading}
        >
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>
                  <h3
                    id="demo-requests-heading"
                    className="flex items-center gap-2"
                  >
                    <Send aria-hidden="true" className="size-4" />
                    Demo Requests
                  </h3>
                </CardTitle>
                <CardDescription>
                  Public inquiries ordered by organization for quick review.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="tabular-nums">
                {demoRequests.data?.totalCount ?? 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <PanelError
              error={demoRequests.error}
              label="Demo Requests"
              onRetry={demoRequests.onRetry}
            />
            {demoRequests.isLoading && !demoRequests.data ? (
              <PanelLoading label="Demo Requests" />
            ) : null}
            {demoRequests.data ? (
              demoRequests.data.items.length ? (
                <>
                  <ul className="divide-y">
                    {demoRequests.data.items.map((request) => (
                      <li
                        key={request.id}
                        className="py-3 first:pt-0"
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
                  <PanelPagination
                    itemCount={demoRequests.data.items.length}
                    label="requests"
                    panelLabel="Demo Requests"
                    page={demoRequests.data.page}
                    pageSize={demoRequests.data.pageSize}
                    totalCount={demoRequests.data.totalCount}
                    disabled={demoRequests.isLoading}
                    onPageChange={demoRequests.onPageChange}
                  />
                </>
              ) : (
                <EmptyState message="No demo requests have been recorded." />
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function PanelError({
  error,
  label,
  onRetry,
}: {
  error: unknown
  label: string
  onRetry: () => void
}) {
  if (!error) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>{label} could not be loaded</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>Refresh after confirming the POMS API is available.</span>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function PanelLoading({ label }: { label: string }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      Loading {label}…
    </p>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}

function PanelPagination({
  disabled,
  itemCount,
  label,
  onPageChange,
  page,
  pageSize,
  panelLabel,
  totalCount,
}: {
  disabled: boolean
  itemCount: number
  label: string
  onPageChange: (page: number) => void
  page: number
  pageSize: number
  panelLabel: string
  totalCount: number
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const firstItem = (page - 1) * pageSize + 1
  const lastItem = firstItem + itemCount - 1

  return (
    <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground tabular-nums"
      >
        Showing {firstItem}–{lastItem} of {totalCount} {label}. Page {page} of{' '}
        {totalPages}.
      </p>
      <nav
        aria-label={`${panelLabel} pagination`}
        className="flex items-center gap-2"
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </nav>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
