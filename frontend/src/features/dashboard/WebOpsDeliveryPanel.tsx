import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { LoadingState, ErrorState, EmptyState } from '#/components/ui/content-state'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { deliveryTones } from '#/features/dashboard/dashboard-status'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { getWebOpsErrorMessage, getWebOpsNotificationAttempts, getWebOpsNotifications, resendWebOpsNotification, type WebOpsNotification } from '#/api/web-ops'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { WebOpsProcessingControls } from './WebOpsProcessingControls'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

const kindLabels = { MailingListAlert: 'Mailing-list staff alert', TechnicalBrief: 'Technical brief', DemoRequestAlert: 'Demo-request staff alert' }
const stateLabels = { Pending: 'Queued', Processing: 'Sending', Accepted: 'Accepted by email provider', Failed: 'Needs attention', Cancelled: 'Cancelled' }
const formatTime = (value: string) => formatDisplayTimestamp(value, { locale: 'en-US' })

export function WebOpsDeliveryPanel() {
  const { deliveryId } = useSearch({ strict: false })
  const [page, setPage] = useState(1)
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [selected, setSelected] = useState<WebOpsNotification>()
  const [success, setSuccess] = useState<string>()
  const actionButton = useRef<HTMLButtonElement | null>(null)
  const heading = useRef<HTMLHeadingElement | null>(null)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['web-ops', 'notifications', page, attentionOnly, deliveryId], queryFn: () => getWebOpsNotifications(deliveryId ? 1 : page, attentionOnly, deliveryId), refetchInterval: 30_000 })
  const resend = useMutation({ mutationFn: resendWebOpsNotification, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['web-ops'] }) } })
  function closeDialog() {
    setSelected(undefined)
  }
  async function confirm() {
    if (!selected) return
    try {
      await resend.mutateAsync(selected)
      setSuccess('Email was queued. Delivery status will update automatically.')
      closeDialog()
    } catch { /* Preserve the reviewed message and show actionable recovery in the dialog. */ }
  }
  return <Card>
    <CardHeader>
      <CardTitle><h3 ref={heading} tabIndex={-1}>Email delivery</h3></CardTitle>
      <CardDescription>Failed messages retry automatically up to five attempts. Provider acceptance does not confirm inbox delivery. An interrupted attempt may already have sent email; review history before resending.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4" aria-busy={query.isFetching}>
      {deliveryId ? <Button asChild variant="outline"><Link to="/website-operations" search={{ section: 'email-delivery' }}>View all email deliveries</Link></Button> : null}
      <WebOpsProcessingControls attentionOnly={attentionOnly} onAttentionChange={value => { setAttentionOnly(value); setPage(1) }} />
      {success && <p role="status" className="text-sm">{success}</p>}
      {query.isError && <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center gap-2">{getWebOpsErrorMessage(query.error, 'Email delivery could not be loaded.')}<Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry email delivery</Button></AlertDescription></Alert>}
      {query.isPending && <LoadingState  label={<>Loading email delivery…</>} />}
      {!query.isError && query.data && query.data.items.length === 0 && <p className="text-sm text-muted-foreground">{attentionOnly ? 'No email messages need attention.' : 'No email delivery records yet. Older signups appear in Mailing List; their original delivery status is unknown.'}</p>}
      {query.data && <ul className="divide-y">{query.data.items.map(item => <li key={item.id} className="space-y-2 py-4 first:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="font-medium break-words">{kindLabels[item.kind]} · {item.organizationName}</p><p className="text-sm text-muted-foreground">{item.contactName} · Intake {item.intakeId.slice(0, 8)}</p><p className="text-xs text-muted-foreground">{item.attemptCount} attempt(s){item.lastAttemptAtUtc && ` · Last attempted ${formatTime(item.lastAttemptAtUtc)}`}</p></div>
          <DomainStatusBadge status={item.isProcessingExpired ? 'Interrupted' : item.state} tones={deliveryTones}>{item.isProcessingExpired ? 'Interrupted' : stateLabels[item.state]}</DomainStatusBadge>
        </div>
        {item.lastError && <p className="text-sm text-destructive">{item.lastError}</p>}
        {item.nextAttemptAtUtc && <p className="text-xs text-muted-foreground">Next attempt: {formatTime(item.nextAttemptAtUtc)}</p>}
        {item.acceptedAtUtc && <p className="text-xs text-muted-foreground">Last provider acceptance: {formatTime(item.acceptedAtUtc)}</p>}
        <NotificationHistory id={item.id} label={`${kindLabels[item.kind]} for ${item.organizationName}`} pending={resend.isPending}
          onResend={item.canResend ? () => { actionButton.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; resend.reset(); setSelected(item); setSuccess(undefined) } : undefined} />
        {(item.state === 'Accepted' || item.state === 'Failed') && !item.canResend && <p className="text-xs text-muted-foreground">Resending requires an active intake record and a five-minute wait after the previous attempt.</p>}
      </li>)}</ul>}
      {query.data && query.data.totalCount > query.data.pageSize && <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Email delivery pages">
        <Button size="sm" variant="outline" disabled={query.isFetching || query.data.page <= 1} onClick={() => setPage((query.data?.page ?? page) - 1)}>Previous</Button>
        <p className="text-sm">Page {query.data.page} of {Math.ceil(query.data.totalCount / query.data.pageSize)}</p>
        <Button size="sm" variant="outline" disabled={query.isFetching || query.data.page * query.data.pageSize >= query.data.totalCount} onClick={() => setPage((query.data?.page ?? page) + 1)}>Next</Button>
      </nav>}
    </CardContent>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !resend.isPending) closeDialog() }}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); (actionButton.current?.isConnected ? actionButton.current : heading.current)?.focus() }}>
        <DialogHeader><DialogTitle>Queue this email again?</DialogTitle></DialogHeader>
        <div><DialogDescription>{selected ? `${kindLabels[selected.kind]} for ${selected.contactName} at ${selected.organizationName}. Recipient: ${selected.recipientEmail ?? 'Phaeno staff'}. ` : ''}This can send a duplicate if an earlier attempt reached the recipient. Check the request and delivery history before continuing.</DialogDescription></div>
        {resend.isError && <Alert variant="destructive"><AlertDescription>{getWebOpsErrorMessage(resend.error, 'The email could not be queued.')}<Button size="sm" variant="outline" onClick={async () => { const current = await query.refetch(); if (current.error) return; const refreshed = current.data?.items.find(item => item.id === selected?.id); if (refreshed?.canResend) { setSelected(refreshed); resend.reset() } else closeDialog() }}>Refresh delivery status</Button></AlertDescription></Alert>}
        <DialogFooter><Button variant="outline" disabled={resend.isPending} onClick={closeDialog}>Cancel</Button><Button disabled={resend.isPending} onClick={() => void confirm()}>{resend.isPending ? 'Queuing…' : 'Queue resend'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
}

function NotificationHistory({ id, label, pending, onResend }: { id: string; label: string; pending: boolean; onResend?: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const query = useQuery({ queryKey: ['web-ops', 'notification-attempts', id], queryFn: () => getWebOpsNotificationAttempts(id), enabled: open, refetchInterval: open ? 30_000 : false })
  return <div className="min-w-0">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="outline" size="sm" aria-label={`Actions: ${label}`}>Actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setOpen(!open)}>{open ? 'Hide attempts' : 'View attempts'}</DropdownMenuItem>
        {onResend ? <DropdownMenuItem disabled={pending} onSelect={() => { trigger.current?.focus(); onResend() }}>Queue resend</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </ActionMenu>
    {open && <div id={`delivery-history-${id}`} className="mt-2 space-y-2 text-xs">
      {query.isPending && <LoadingState  label={<>Loading attempts…</>} />}
      {query.isError && <ErrorState title={<CustomerSourceText source="Could not load this content" />} action={<Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry history</Button>}>Attempt history could not be loaded. </ErrorState>}
      {query.data?.length === 0 && <EmptyState  kind="empty" title={<>No delivery attempts yet.</>} />}
      {query.data?.map(attempt => <p key={attempt.attemptNumber}>Attempt {attempt.attemptNumber} · {formatTime(attempt.startedAtUtc)} · {attempt.outcome}{attempt.staffRequested ? ' · Requested by staff' : ''}{attempt.error ? ` · ${attempt.error}` : ''}</p>)}
      {query.data?.length === 50 && <p>Showing the 50 most recent attempts.</p>}
    </div>}
  </div>
}
