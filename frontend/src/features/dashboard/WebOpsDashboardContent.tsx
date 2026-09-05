import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  RefreshCw,
  Send,
  UserMinus,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import {
  getWebOpsErrorMessage,
  type WebOpsDemoRequest,
  type WebOpsMailingListContact,
  type WebOpsPage,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs'

type WebOpsPanelAction<T> = {
  error: unknown
  isPending: boolean
  onExecute: (item: T) => Promise<void>
  onReset: () => void
}

type WebOpsPanelState<T> = {
  data?: WebOpsPage<T>
  error: unknown
  isLoading: boolean
  onPageChange: (page: number) => void
  onRetry: () => void
  action?: WebOpsPanelAction<T>
}

type WebOpsDashboardContentProps = {
  mailingList: WebOpsPanelState<WebOpsMailingListContact>
  demoRequests: WebOpsPanelState<WebOpsDemoRequest>
  isMockData?: boolean
  notificationPanel?: ReactNode
  briefAction?: WebOpsPanelAction<WebOpsMailingListContact>
}

export function WebOpsDashboardContent({
  mailingList,
  demoRequests,
  isMockData = false,
  notificationPanel,
  briefAction,
}: WebOpsDashboardContentProps) {
  const [contactToUnsubscribe, setContactToUnsubscribe] =
    useState<WebOpsMailingListContact>()
  const [requestToComplete, setRequestToComplete] =
    useState<WebOpsDemoRequest>()
  const [briefContact, setBriefContact] = useState<WebOpsMailingListContact>()
  const [mailingListSuccess, setMailingListSuccess] = useState<string>()
  const [demoRequestSuccess, setDemoRequestSuccess] = useState<string>()
  const mailingListActionButton = useRef<HTMLElement | null>(null)
  const demoRequestActionButton = useRef<HTMLElement | null>(null)
  const mailingListHeading = useRef<HTMLHeadingElement | null>(null)
  const demoRequestsHeading = useRef<HTMLHeadingElement | null>(null)
  const hasNotificationPanel = Boolean(notificationPanel)
  const responsiveTabClass = hasNotificationPanel
    ? 'min-h-11 flex-col gap-0.5 whitespace-normal px-2 py-1.5 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:whitespace-nowrap sm:py-0.5'
    : undefined

  const closeUnsubscribeDialog = () => {
    setContactToUnsubscribe(undefined)
    requestAnimationFrame(() => {
      const actionButton = mailingListActionButton.current
      if (actionButton?.isConnected) {
        actionButton.focus()
        return
      }

      mailingListHeading.current?.focus()
    })
  }

  const closeCompleteDialog = () => {
    setRequestToComplete(undefined)
    requestAnimationFrame(() => {
      const actionButton = demoRequestActionButton.current
      if (actionButton?.isConnected) {
        actionButton.focus()
        return
      }

      demoRequestsHeading.current?.focus()
    })
  }

  const confirmUnsubscribe = async () => {
    if (!contactToUnsubscribe || !mailingList.action) return

    try {
      await mailingList.action.onExecute(contactToUnsubscribe)
      setMailingListSuccess(
        `${contactToUnsubscribe.email} was unsubscribed and removed from the active list.`,
      )
      closeUnsubscribeDialog()
    } catch {
      // The mutation error remains in the confirmation dialog for retry.
    }
  }

  const confirmComplete = async () => {
    if (!requestToComplete || !demoRequests.action) return

    try {
      await demoRequests.action.onExecute(requestToComplete)
      setDemoRequestSuccess(
        `${requestToComplete.organizationName} demo request was marked complete.`,
      )
      closeCompleteDialog()
    } catch {
      // The mutation error remains in the confirmation dialog for retry.
    }
  }

  return (
    <section aria-labelledby="web-ops-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="web-ops-heading" className="text-lg font-semibold">
            Web Operations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasNotificationPanel
              ? 'Review public Website signups, demo requests, and email delivery.'
              : 'Review mailing-list signups and demo requests received from the public Website.'}
          </p>
        </div>
        <Badge variant="outline">
          {isMockData ? 'Mock data' : 'Active intake'}
        </Badge>
      </div>

      <Tabs defaultValue="mailing-list">
        <TabsList aria-label="Web Operations lists" className={hasNotificationPanel ? 'grid w-full grid-cols-3 gap-1 group-data-horizontal/tabs:h-auto sm:w-fit' : undefined}>
          <TabsTrigger value="mailing-list" className={responsiveTabClass}>
            <Mail aria-hidden="true" className={hasNotificationPanel ? 'hidden sm:block' : undefined} />
            <span>Mailing List</span>
            <Badge variant="secondary" className={hasNotificationPanel ? 'tabular-nums sm:ml-1' : 'ml-1 tabular-nums'}>
              {mailingList.data?.totalCount ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="demo-requests" className={responsiveTabClass}>
            <Send aria-hidden="true" className={hasNotificationPanel ? 'hidden sm:block' : undefined} />
            <span>Demo Requests</span>
            <Badge variant="secondary" className={hasNotificationPanel ? 'tabular-nums sm:ml-1' : 'ml-1 tabular-nums'}>
              {demoRequests.data?.totalCount ?? 0}
            </Badge>
          </TabsTrigger>
          {hasNotificationPanel ? <TabsTrigger value="email-delivery" className={responsiveTabClass}>
            <Mail aria-hidden="true" className="hidden sm:block" />
            <span>Email delivery</span>
          </TabsTrigger> : null}
        </TabsList>

        <TabsContent value="mailing-list">
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
                      ref={mailingListHeading}
                      tabIndex={-1}
                      className="flex items-center gap-2"
                    >
                      <Mail aria-hidden="true" className="size-4" />
                      Mailing List
                    </h3>
                  </CardTitle>
                  <CardDescription>
                    Active public signups, including technical-brief requests.
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
              {mailingListSuccess ? (
                <ActionSuccess
                  title="Mailing List updated"
                  message={mailingListSuccess}
                />
              ) : null}
              {mailingList.isLoading && !mailingList.data ? (
                <PanelLoading label="Mailing List" />
              ) : null}
              {mailingList.data ? (
                mailingList.data.items.length ? (
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
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
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
                          {briefAction && contact.technicalBriefRequested && contact.technicalBriefDeliveryRecorded === false && <Button
                            size="sm" variant="outline" disabled={briefAction.isPending}
                            onClick={event => { mailingListActionButton.current = event.currentTarget; briefAction.onReset(); setBriefContact(contact) }}
                          >Queue technical brief</Button>}
                          {mailingList.action ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={mailingList.action.isPending}
                              onClick={(event) => {
                                mailingListActionButton.current =
                                  event.currentTarget
                                mailingList.action?.onReset()
                                setMailingListSuccess(undefined)
                                setContactToUnsubscribe(contact)
                              }}
                            >
                              <UserMinus
                                aria-hidden="true"
                                data-icon="inline-start"
                              />
                              Unsubscribe
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No active mailing-list signups." />
                )
              ) : null}
            </CardContent>
            {mailingList.data?.items.length ? (
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
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="demo-requests">
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
                      ref={demoRequestsHeading}
                      tabIndex={-1}
                      className="flex items-center gap-2"
                    >
                      <Send aria-hidden="true" className="size-4" />
                      Demo Requests
                    </h3>
                  </CardTitle>
                  <CardDescription>
                    Open public inquiries ordered by organization.
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
              {demoRequestSuccess ? (
                <ActionSuccess
                  title="Demo Request updated"
                  message={demoRequestSuccess}
                />
              ) : null}
              {demoRequests.isLoading && !demoRequests.data ? (
                <PanelLoading label="Demo Requests" />
              ) : null}
              {demoRequests.data ? (
                demoRequests.data.items.length ? (
                  <ul className="divide-y">
                    {demoRequests.data.items.map((request) => (
                      <li key={request.id} className="py-3 first:pt-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div>
                            <p className="font-medium">
                              {request.organizationName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.firstName} {request.lastName}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <a
                              href={`mailto:${request.email}`}
                              className="break-all text-sm text-primary hover:underline sm:text-right"
                            >
                              {request.email}
                            </a>
                            {demoRequests.action ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={demoRequests.action.isPending}
                                onClick={(event) => {
                                  demoRequestActionButton.current =
                                    event.currentTarget
                                  demoRequests.action?.onReset()
                                  setDemoRequestSuccess(undefined)
                                  setRequestToComplete(request)
                                }}
                              >
                                <CheckCircle2
                                  aria-hidden="true"
                                  data-icon="inline-start"
                                />
                                Mark complete
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                          {request.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No open demo requests." />
                )
              ) : null}
            </CardContent>
            {demoRequests.data?.items.length ? (
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
            ) : null}
          </Card>
        </TabsContent>
        {hasNotificationPanel ? <TabsContent value="email-delivery">{notificationPanel}</TabsContent> : null}
      </Tabs>
      <WebOpsActionDialog
        open={Boolean(briefContact)}
        title="Queue this requested technical brief?"
        description={`This older signup requested a technical brief, but its original email delivery status is unknown. This queues the brief for ${briefContact?.email ?? 'the signup email'} and may send a duplicate. Review the request before continuing.`}
        confirmLabel="Queue technical brief"
        pendingLabel="Queuing…"
        errorTitle="Technical brief was not queued"
        error={briefAction?.error}
        isPending={briefAction?.isPending ?? false}
        onOpenChange={open => { if (!open && !briefAction?.isPending) { setBriefContact(undefined); closeUnsubscribeDialog() } }}
        onConfirm={async () => {
          if (!briefContact || !briefAction) return
          try {
            await briefAction.onExecute(briefContact)
            setMailingListSuccess('The requested technical brief was queued. Review its status in Email delivery.')
            setBriefContact(undefined)
            closeUnsubscribeDialog()
          } catch { /* The error remains visible for recovery. */ }
        }}
      />

      <WebOpsActionDialog
        open={Boolean(contactToUnsubscribe)}
        title={`Unsubscribe ${contactToUnsubscribe?.firstName ?? ''} ${contactToUnsubscribe?.lastName ?? ''}?`}
        description={`This removes ${contactToUnsubscribe?.email ?? 'this signup'} from the active Mailing List. The original Website submission remains in POMS.`}
        confirmLabel="Unsubscribe"
        pendingLabel="Unsubscribing…"
        errorTitle="Signup was not unsubscribed"
        error={mailingList.action?.error}
        isPending={mailingList.action?.isPending ?? false}
        destructive
        onConfirm={confirmUnsubscribe}
        onOpenChange={(open) => {
          if (!open && !mailingList.action?.isPending) {
            closeUnsubscribeDialog()
          }
        }}
      />
      <WebOpsActionDialog
        open={Boolean(requestToComplete)}
        title={`Mark the ${requestToComplete?.organizationName ?? ''} demo request complete?`}
        description="This removes the request from the active Demo Requests list. The original Website inquiry remains in POMS."
        confirmLabel="Mark complete"
        pendingLabel="Completing…"
        errorTitle="Demo request was not completed"
        error={demoRequests.action?.error}
        isPending={demoRequests.action?.isPending ?? false}
        onConfirm={confirmComplete}
        onOpenChange={(open) => {
          if (!open && !demoRequests.action?.isPending) {
            closeCompleteDialog()
          }
        }}
      />
    </section>
  )
}

function WebOpsActionDialog({
  confirmLabel,
  description,
  destructive = false,
  error,
  errorTitle,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  pendingLabel,
  title,
}: {
  confirmLabel: string
  description: string
  destructive?: boolean
  error: unknown
  errorTitle: string
  isPending: boolean
  onConfirm: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  pendingLabel: string
  title: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>
          <DialogDescription>{description}</DialogDescription>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>
              {getWebOpsErrorMessage(
                error,
                'The request could not be saved. Try again.',
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionSuccess({
  message,
  title,
}: {
  message: string
  title: string
}) {
  return (
    <Alert className="mb-4" role="status">
      <CheckCircle2 aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
  if (totalPages <= 1) return null

  const firstItem = (page - 1) * pageSize + 1
  const lastItem = firstItem + itemCount - 1

  return (
    <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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
    </CardFooter>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
