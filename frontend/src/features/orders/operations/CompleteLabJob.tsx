import { useMutation } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'

import { completeLabJob, getOrderErrorMessage, isOrderConcurrencyError, type LabServiceOrder } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFeedback, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

export function CompleteLabJob({ order, authorized, onSaved, renderActions, onCloseAutoFocus }: {
  order: LabServiceOrder; authorized: boolean; onSaved: () => Promise<unknown>
  renderActions?: (openCompletion: (() => void) | undefined, dialogOpen: boolean) => ReactNode
  onCloseAutoFocus?: (event: Event) => void
}) {
  const [open, setOpen] = useState(false)
  const [reviewedVersion, setReviewedVersion] = useState(order.version)
  const attempt = useRef<{ version: number; key: string } | null>(null)
  const mutation = useMutation({
    mutationFn: () => {
      attempt.current ??= { version: reviewedVersion, key: crypto.randomUUID() }
      return completeLabJob(order.id, attempt.current.version, attempt.current.key)
    },
    onSuccess: async () => { attempt.current = null; setOpen(false); await onSaved() },
  })
  const reload = useMutation({
    mutationFn: onSaved,
    onSuccess: () => { attempt.current = null; mutation.reset(); setOpen(false) },
  })
  if (!authorized || !['InProgress', 'ResultsAvailable'].includes(order.status)) return renderActions?.(undefined, false) ?? null
  const unresolved = order.samples.filter(sample => !['Completed', 'Rejected', 'Failed', 'Cancelled'].includes(sample.status)).length
  const ready = order.samples.length > 0 && unresolved === 0
  const conflict = isOrderConcurrencyError(mutation.error)
  const pending = mutation.isPending || reload.isPending
  function openCompletion() {
    if (!attempt.current) { setReviewedVersion(order.version); mutation.reset() }
    reload.reset(); setOpen(true)
  }
  return <>
    {renderActions ? renderActions(openCompletion, open) : <Button type="button" variant="outline" onClick={openCompletion}>Complete Job</Button>}
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value) }}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Complete Job {order.orderNumber}</DialogTitle>
          <DialogDescription>Close this Job after reviewing every sample outcome. Completion issues its invoice from the accepted quote and applicable approved billing details. Unpaid PSeq invoices do not prevent scientific result access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>{order.customerReference} · {order.samples.length} samples</p>
          {!ready ? <p role="status">{order.samples.length === 0 ? 'Add and finalize the sample roster before completing this Job.' : `${unresolved} samples still need a final laboratory outcome. Review their Lab work before completion.`}</p> : <p>All samples have a recorded final laboratory outcome. Review the accepted quote and billing details before confirming.</p>}
          <p>Failed processing remains billable at the accepted price. Any credit or replacement requires a separate reviewed decision.</p>
          {conflict ? <p role="alert">The Job changed after you reviewed it. Reload, review its current outcomes, then open completion again.</p> : null}
        </div>
        {mutation.error || reload.error ? <DialogFeedback><p role="alert">{getOrderErrorMessage(reload.error ?? mutation.error, 'Completion could not be confirmed. Retry to recover the same operation.')}</p></DialogFeedback> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          {conflict ? <Button type="button" disabled={pending} onClick={() => reload.mutate()}>Reload Job</Button>
            : <Button type="button" disabled={!ready || pending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Completing…' : 'Confirm completion'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
