import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { reconcileAssembly, type AssemblyDetail, type AssemblyReconciliationReview } from '#/api/lab-assembly'
import { getLabOperationsError } from '#/api/lab-operations'
import { GuardedFormDialog, ConfirmationFormContent } from '#/components/GuardedFormDialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { DetailField, DetailSummary } from '#/components/ui/detail-summary'
import { DialogClose, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { assemblyStateLabel } from './assembly-jobs'

const date = (value: string | null) => formatDisplayTimestamp(value, { seconds: true, empty: 'Not recorded' })
const observationLabel = (status: string) => ({ MissingHistory: 'Provider history missing', UnavailableOrInconsistent: 'Provider evidence unavailable or inconsistent', Observed: 'Provider execution observed' })[status] ?? status

export function AssemblyReconciliationEvidence({ review }: { review: AssemblyReconciliationReview }) {
  const receipts = review.receipts.filter(receipt => ['Succeeded', 'Failed', 'Terminated', 'CancelledBeforeStart'].includes(receipt.state ?? '') || receipt.outcome === 'Conflict' || receipt.conflictSha256)
  return <div className="space-y-3">
    {receipts.map(receipt => <div key={receipt.id} className="min-w-0 space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{receipt.state ? assemblyStateLabel(receipt.state) : 'Command evidence'} · {receipt.outcome === 'Conflict' || receipt.conflictSha256 ? 'Conflicting receipt retained' : 'Applied receipt retained'}</p>
      <DetailSummary>
        <DetailField label="Provider event" value={receipt.eventId} />
        <DetailField label="Actual start" value={date(receipt.startedAtUtc)} />
        <DetailField label="Actual stop" value={date(receipt.stoppedAtUtc)} />
        <DetailField label="Final disposition time" value={date(receipt.dispositionAtUtc)} />
        <DetailField label="Exact recorded times" value={`Start: ${receipt.startedAtUtc ?? 'Not recorded'}\nStop: ${receipt.stoppedAtUtc ?? 'Not recorded'}\nDisposition: ${receipt.dispositionAtUtc ?? 'Not recorded'}`} />
        <DetailField label="Reported reason" value={receipt.reason} />
        <DetailField label="Payload SHA-256" value={receipt.payloadSha256} />
        {receipt.conflictSha256 ? <DetailField label="Conflicting payload SHA-256" value={receipt.conflictSha256} /> : null}
      </DetailSummary>
    </div>)}
    {review.additionalEvidence.map(evidence => <div key={evidence.id} className="min-w-0 space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Changed payload retained · {evidence.state ? assemblyStateLabel(evidence.state) : 'Command evidence'}</p>
      <DetailSummary><DetailField label="Provider event" value={evidence.eventId} />
        <DetailField label="Actual start" value={date(evidence.startedAtUtc)} />
        <DetailField label="Actual stop" value={date(evidence.stoppedAtUtc)} />
        <DetailField label="Exact recorded times" value={`Start: ${evidence.startedAtUtc ?? 'Not recorded'}\nStop: ${evidence.stoppedAtUtc ?? 'Not recorded'}`} />
        <DetailField label="Reported reason" value={evidence.reason} />
        <DetailField label="Payload SHA-256" value={evidence.payloadSha256} /></DetailSummary>
    </div>)}
  </div>
}

export function AssemblyReconciliationPanel({ data }: { data: AssemblyDetail }) {
  const review = data.reconciliation
  if (!review.hasUnresolvedConflict && !review.decisions.length) return null
  return <Card><CardHeader><CardTitle>Operations reconciliation</CardTitle>
    <CardDescription>Original execution facts and processing receipts remain unchanged. Decisions apply only to the exact evidence reviewed.</CardDescription>
  </CardHeader><CardContent className="space-y-4">
    {review.hasUnresolvedConflict ? <p role="status">{review.eligible
      ? data.canReconcile ? 'Review the retained receipts, then choose Reconcile for repeat.' : 'A Laboratory Supervisor or Operations Administrator must review this conflict before assembly can be repeated.'
      : review.ineligibleReason}</p> : <p role="status">The reviewed conflict is resolved. An operator can request a separate repeat assembly with a reason.</p>}
    <AssemblyReconciliationEvidence review={review} />
    {review.decisions.map(record => <div key={record.id} className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Retain {assemblyStateLabel(record.decision.savedExecution.state)} · {date(record.recordedAtUtc)}</p>
      <DetailSummary><DetailField label="Reviewed by" value={record.actorUserId} />
        <DetailField label="Decision reason" value={record.decision.reason} />
        <DetailField label="Independent verification" value={record.decision.verificationEvidence} />
        <DetailField label="Provider check" value={observationLabel(record.decision.providerObservation.status)} />
        <DetailField label="Original execution stopped and cannot resume" value={record.decision.confirmedStopped} /></DetailSummary>
    </div>)}
  </CardContent></Card>
}

const schema = z.object({
  reason: z.string().trim().min(1, 'Explain why the saved outcome is being retained.').max(2000),
  verificationEvidence: z.string().trim().min(1, 'Document how you verified that the original execution has stopped and cannot resume.').max(4000),
  confirmedStopped: z.boolean().refine(value => value, 'Confirm that the original execution has stopped and cannot resume.'),
})
type Values = z.infer<typeof schema>

export function AssemblyReconciliationDialog({ data, onClose }: { data: AssemblyDetail; onClose: () => void }) {
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [reviewed, setReviewed] = useState(() => ({ version: data.job.version, fingerprint: data.reconciliation.evidenceFingerprint }))
  const [saved, setSaved] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: '', verificationEvidence: '', confirmedStopped: false }, mode: 'onBlur' })
  const changed = reviewed.version !== data.job.version || reviewed.fingerprint !== data.reconciliation.evidenceFingerprint
  const mutation = useMutation({
    mutationFn: (values: Values) => reconcileAssembly(data.job, { ...values, id: requestId, version: reviewed.version, evidenceFingerprint: reviewed.fingerprint }),
    onSuccess: async () => {
      form.reset(); setSaved(true)
      await Promise.all([client.invalidateQueries({ queryKey: ['assembly-job', data.job.id] }), client.invalidateQueries({ queryKey: ['assembly-jobs'] })])
      onClose()
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: ['assembly-job', data.job.id] })
      // A committed decision can outlive a lost save response.
      const refreshed = client.getQueryData<AssemblyDetail>(['assembly-job', data.job.id])
      if (refreshed?.reconciliation.decisions.some(record => record.id === requestId)) { form.reset(); setSaved(true); onClose() }
    },
  })
  return <GuardedFormDialog open onOpenChange={open => { if (!open) onClose() }} dirty={!saved && form.formState.isDirty} pending={mutation.isPending} returnFocusId="assembly-context-actions" fallbackFocusId="assembly-attempt-heading">
    <ConfirmationFormContent>
      <DialogHeader><DialogTitle>Reconcile for repeat</DialogTitle>
        {mutation.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(mutation.error, 'Reconciliation could not be recorded. Your entered values are retained.')}</AlertDescription></Alert> : null}
        {changed ? <Alert><AlertTitle>Review updated evidence</AlertTitle><AlertDescription>This attempt or its receipts changed. Your text is retained. Review the evidence below before confirming again.</AlertDescription></Alert> : null}
      </DialogHeader>
      <div className="space-y-4">
        <DialogDescription>For {data.job.sampleName} · Run {data.job.sequencingRunNumber}, retain the saved {assemblyStateLabel(data.job.state)} outcome and original execution times. This records a review decision and permits a separate repeat request. It does not start processing or approve results.</DialogDescription>
        <AssemblyReconciliationEvidence review={data.reconciliation} />
        <p className="text-sm">Document independent evidence that the original execution has stopped and cannot resume. Missing provider history or a NotAccepted response alone does not establish this.</p>
        {changed ? <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => {
          setReviewed({ version: data.job.version, fingerprint: data.reconciliation.evidenceFingerprint })
          form.setValue('confirmedStopped', false); mutation.reset()
        }}>I have reviewed the updated evidence</Button> : null}
        <form id="assembly-reconciliation-form" className="space-y-4" noValidate onSubmit={form.handleSubmit(values => {
          if (!changed && data.reconciliation.eligible && !mutation.isPending) mutation.mutate(values)
        })}>
          <Field><Label htmlFor="assembly-reconciliation-reason"><RequiredFieldName>Decision reason</RequiredFieldName></Label>
            <Textarea id="assembly-reconciliation-reason" {...form.register('reason')} maxLength={2000} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="assembly-reconciliation-reason-error" />
            <FieldError id="assembly-reconciliation-reason-error" reserveSpace>{form.formState.errors.reason?.message}</FieldError></Field>
          <Field><Label htmlFor="assembly-reconciliation-evidence"><RequiredFieldName>Independent verification evidence</RequiredFieldName></Label>
            <Textarea id="assembly-reconciliation-evidence" {...form.register('verificationEvidence')} maxLength={4000} aria-invalid={Boolean(form.formState.errors.verificationEvidence)} aria-describedby="assembly-reconciliation-evidence-error" />
            <FieldError id="assembly-reconciliation-evidence-error" reserveSpace>{form.formState.errors.verificationEvidence?.message}</FieldError></Field>
          <Field><Label htmlFor="assembly-reconciliation-stopped" className="items-start">
            <NativeCheckbox id="assembly-reconciliation-stopped" {...form.register('confirmedStopped')} aria-invalid={Boolean(form.formState.errors.confirmedStopped)} aria-describedby="assembly-reconciliation-stopped-error" />
            <RequiredFieldName>I verified that the original execution has stopped and cannot resume.</RequiredFieldName></Label>
            <FieldError id="assembly-reconciliation-stopped-error" reserveSpace>{form.formState.errors.confirmedStopped?.message}</FieldError></Field>
        </form>
      </div>
      <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose>
        <Button type="submit" form="assembly-reconciliation-form" disabled={mutation.isPending || changed || !data.reconciliation.eligible}>{mutation.isPending ? 'Recording…' : 'Record reconciliation'}</Button></RequiredDialogFooter>
    </ConfirmationFormContent>
  </GuardedFormDialog>
}
