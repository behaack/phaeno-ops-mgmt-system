import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getWebOpsErrorMessage, getWebOpsNotificationSummary, updateWebOpsNotificationProcessing, type WebOpsNotificationSummary } from '#/api/web-ops'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const reasonSchema = z.object({ reason: z.string().trim().min(1, 'Enter a reason for this change.').max(500, 'Use 500 characters or fewer.') })

export function WebOpsProcessingControls({ attentionOnly, onAttentionChange }: { attentionOnly: boolean; onAttentionChange: (value: boolean) => void }) {
  const query = useQuery({ queryKey: ['web-ops', 'notification-summary'], queryFn: getWebOpsNotificationSummary, refetchInterval: 30_000 })
  const [reviewed, setReviewed] = useState<WebOpsNotificationSummary | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const summary = query.data
  function close() { setReviewed(null); requestAnimationFrame(() => button.current?.focus()) }
  return <section className="space-y-3 border-b pb-4" aria-label="Email processing and queue status">
    {query.isPending && <p role="status">Loading email processing status…</p>}
    {query.isError && <Alert variant="destructive"><AlertTitle>Email processing status is unavailable</AlertTitle><AlertDescription>
      {summary ? 'Previously loaded counts may be out of date. ' : ''}{getWebOpsErrorMessage(query.error, 'Try loading the current status again.')}
      <Button type="button" variant="outline" className="text-foreground" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry processing status</Button>
    </AlertDescription></Alert>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {summary && <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-medium">{summary.isPaused ? 'Email delivery is paused' : 'Email delivery is running'}</p>
          <p className="text-sm text-muted-foreground">{summary.isPaused ? 'New messages remain queued. Messages already being sent may finish.' : 'Queued messages are processed automatically.'} Public Website intake remains available.</p></div>
        <Button type="button" variant="outline" ref={button} disabled={query.isError} onClick={() => { setNotice(null); setReviewed(summary) }}>{summary.isPaused ? 'Resume email delivery' : 'Pause email delivery'}</Button>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-muted-foreground">Queued messages</dt><dd className="font-semibold">{summary.pendingCount}</dd></div>
        <div><dt className="text-muted-foreground">Sending</dt><dd className="font-semibold">{Math.max(0, summary.processingCount - summary.expiredProcessingCount)}</dd></div>
        <div><dt className="text-muted-foreground">Failed messages</dt><dd className="font-semibold">{summary.failedCount}</dd></div>
      </dl>
      {summary.oldestPendingAtUtc && <p className="text-xs text-muted-foreground">Oldest queued message: {formatTime(summary.oldestPendingAtUtc)}</p>}
      {summary.expiredProcessingCount > 0 && <p role="status" className="text-sm">{summary.expiredProcessingCount} interrupted {summary.expiredProcessingCount === 1 ? 'attempt needs' : 'attempts need'} recovery. {summary.isPaused ? 'Resume delivery to allow automatic recovery.' : 'Automatic recovery will retry eligible work.'}</p>}
      {summary.updatedAtUtc && <p className="break-words text-xs text-muted-foreground">Last changed {formatTime(summary.updatedAtUtc)}{summary.updatedByName ? ` by ${summary.updatedByName}` : ''}{summary.reason ? ` · ${summary.reason}` : ''}</p>}
    </>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter email delivery">
      <Button type="button" size="sm" variant={attentionOnly ? 'outline' : 'secondary'} aria-pressed={!attentionOnly} onClick={() => onAttentionChange(false)}>All messages</Button>
      <Button type="button" size="sm" variant={attentionOnly ? 'secondary' : 'outline'} aria-pressed={attentionOnly} onClick={() => onAttentionChange(true)}>Needs attention{summary ? ` (${summary.failedCount + summary.expiredProcessingCount})` : ''}</Button>
    </div>
    {reviewed && <ProcessingDialog initial={reviewed} onClose={close} onSaved={paused => { setNotice(paused ? 'Email delivery was paused. New intake continues to queue messages.' : 'Email delivery was resumed. Queued messages will be processed.'); close() }} onReload={async () => { const result = await query.refetch(); if (result.error) throw result.error; return result.data! }} />}
  </section>
}

function ProcessingDialog({ initial, onClose, onSaved, onReload }: { initial: WebOpsNotificationSummary; onClose: () => void; onSaved: (paused: boolean) => void; onReload: () => Promise<WebOpsNotificationSummary> }) {
  const [reviewed, setReviewed] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const reloadLock = useRef(false)
  const targetPaused = !initial.isPaused
  const alreadyApplied = reviewed.isPaused === targetPaused
  const title = targetPaused ? 'Pause email delivery' : 'Resume email delivery'
  const form = useForm<z.infer<typeof reasonSchema>>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } })
  const { isDirty, isSubmitting, errors } = form.formState
  const client = useQueryClient()
  const mutation = useMutation({ mutationFn: updateWebOpsNotificationProcessing, onSuccess: () => client.invalidateQueries({ queryKey: ['web-ops'] }) })
  const busy = isSubmitting || reloading
  function close() { if (!busy && !reloadLock.current && (!isDirty || window.confirm('Discard the unsaved email processing reason?'))) onClose() }
  async function reload() {
    if (reloadLock.current || isSubmitting) return
    reloadLock.current = true; setReloading(true)
    try { setReviewed(await onReload()); setError(null); setRefreshed(true) }
    catch (failure) { setError(getWebOpsErrorMessage(failure, 'Email processing status could not be refreshed. Your reason has been kept.')) }
    finally { reloadLock.current = false; setReloading(false) }
  }
  async function submit(values: z.infer<typeof reasonSchema>) {
    if (reloadLock.current || alreadyApplied) return
    setError(null)
    try { await mutation.mutateAsync({ version: reviewed.version, isPaused: targetPaused, reason: values.reason }); onSaved(targetPaused) }
    catch (failure) { setError(getWebOpsErrorMessage(failure, 'Email processing could not be changed. Your reason has been kept.')); setRefreshed(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent showCloseButton={!busy} onCloseAutoFocus={event => event.preventDefault()}>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{targetPaused ? 'Stop new Website email attempts. Public intake and manual recovery still queue messages; an attempt already in progress may finish.' : 'Process queued Website messages again, including eligible retries. Previously accepted messages are not sent again automatically.'}</DialogDescription></DialogHeader>
    <DialogFeedback>
      {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" className="text-foreground" disabled={busy} onClick={() => void reload()}>Reload delivery status; keep reason</Button></div>}
      {reloading && <p role="status" className="text-sm">Reloading delivery status…</p>}
      {refreshed && <p role="status" className="text-sm">{alreadyApplied ? `Email delivery is already ${targetPaused ? 'paused' : 'running'}. Your reason has not been saved.` : 'The current status was reloaded. Review it and submit your preserved reason again.'}</p>}
    </DialogFeedback>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keep the disabled form keyboard-scrollable while saving or reloading. */}
    <form id="email-processing-form" aria-label="Email processing reason" tabIndex={busy ? 0 : undefined} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" noValidate onSubmit={form.handleSubmit(submit)}><fieldset disabled={busy} className="space-y-1.5">
      <Label htmlFor="email-processing-reason"><RequiredFieldName>Reason</RequiredFieldName></Label>
      <p id="email-processing-reason-help" className="text-xs text-muted-foreground">This reason and your identity are recorded in the change history.</p>
      <Textarea id="email-processing-reason" rows={3} maxLength={500} {...form.register('reason')} aria-invalid={Boolean(errors.reason)} aria-describedby={`email-processing-reason-help${errors.reason ? ' email-processing-reason-error' : ''}`} />
      {errors.reason && <p role="alert" id="email-processing-reason-error" className="text-sm text-destructive">{errors.reason.message}</p>}
    </fieldset></form>
    <RequiredDialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button form="email-processing-form" type="submit" disabled={busy || alreadyApplied}>{isSubmitting ? 'Saving…' : title}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
