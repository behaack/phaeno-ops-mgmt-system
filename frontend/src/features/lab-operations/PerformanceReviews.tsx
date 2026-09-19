import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { executionSteps, type EvidenceRow } from '#/api/lab-investigation'
import type { LabStepPerformance } from '#/api/lab-operations'
import { decidePerformance, getPerformanceReviews, proposePerformance, type PerformanceProposal, type PerformanceReviews as ReviewData } from '#/api/lab-performance-review'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { EvidenceError, EvidencePages, evidenceDate } from './InvestigationEvidence'
import { PerformerPicker } from './PerformerPicker'
import { localTimeOccurrences } from './step-performance'

type Target = { executionId: string; recordId: string; label: string }
const selectClass = 'h-9 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm'
function stepTargets(executions: EvidenceRow[]): Target[] {
  return executions.flatMap(execution => executionSteps(execution).filter(record => record.outcome !== 'skipped' && !record.correctsRecordId)
    .map(record => ({ executionId: execution.id, recordId: record.id, label: `${record.stepKey} · ${evidenceDate(record.recordedAtUtc)} · ${execution.id.slice(0, 8)}` })))
}
export function PerformanceReviews({ workOrderId, specimenId, executions, people }: { workOrderId: string; specimenId: string; executions: EvidenceRow[]; people: ReadonlyMap<string, string> }) {
  const query = useQuery({ queryKey: ['performance-reviews', workOrderId, specimenId], queryFn: () => getPerformanceReviews(workOrderId, specimenId) })
  const client = useQueryClient()
  const [page, setPage] = useState(0)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [review, setReview] = useState<PerformanceProposal | null>(null)
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['performance-reviews', workOrderId, specimenId] }), client.invalidateQueries({ queryKey: ['sample-investigation', workOrderId, specimenId] })]) }
  const name = (id: string) => people.get(id) ?? `User ${id}`
  let targets: Target[] = []
  try { targets = stepTargets(executions) } catch { /* The source evidence error remains visible; do not enable a proposal against unreadable steps. */ }
  return <section className="space-y-3" aria-label="Performer and time reviews">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Performer and time reviews</h3>{query.data?.canPropose && !query.isError ? <Button size="sm" variant="outline" disabled={!targets.length} onClick={() => setProposalOpen(true)}>Propose performer/time change</Button> : null}</div>
    <p className="text-xs text-muted-foreground">Original entries remain unchanged. Work recorded for another person and changes to performer/time require a reason and another supervisor’s approval before they count as verified evidence.</p>
    {query.isError ? <><EvidenceError error={query.error} /><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Reload reviews</Button></> : query.isPending ? <p role="status">Loading performance reviews…</p> : <>
      {query.data.proposals.slice(page * 10, page * 10 + 10).map(proposal => {
        const decision = query.data.decisions.find(item => item.id === proposal.id)
        const superseded = query.data.proposals.some(item => item.basedOnProposalId === proposal.id && query.data.decisions.some(d => d.id === item.id && d.approved))
        return <div key={proposal.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="space-y-1"><p className="text-sm font-medium">{proposal.kind === 'OnBehalf' ? 'Work recorded for another person' : 'Performer/time change'}</p><Badge variant="outline">{decision ? decision.approved ? superseded ? 'Earlier approval' : 'Approved' : 'Rejected' : 'Awaiting independent review'}</Badge></div>{!decision && query.data.canReview ? <Button size="sm" variant="outline" disabled={proposal.requestedByUserId === query.data.actorId} onClick={() => setReview(proposal)}>Review entry</Button> : null}</div>
          <p className="text-xs text-muted-foreground">Requested by {name(proposal.requestedByUserId)} · {evidenceDate(proposal.requestedAtUtc)}</p>
          <p className="whitespace-pre-wrap text-sm">{proposal.reason}</p>
          {!decision && proposal.requestedByUserId === query.data.actorId ? <p className="text-xs text-muted-foreground">A different supervisor must review your entry.</p> : null}
          {decision ? <p className="text-xs">{decision.approved ? 'Approved' : 'Rejected'} by {name(decision.reviewedByUserId)} · {evidenceDate(decision.reviewedAtUtc)} · {decision.reason}</p> : null}
          <details className="text-sm"><summary className="cursor-pointer">Previous and proposed evidence</summary><div className="mt-2 grid gap-4 md:grid-cols-2"><div><h3 className="font-medium">Previous attribution</h3><Attribution json={proposal.originalPerformanceJson} people={people} /></div><div><h3 className="font-medium">Proposed attribution</h3><Attribution json={proposal.performanceJson} people={people} /></div></div></details>
        </div>
      })}
      {!query.data.proposals.length ? <p className="text-sm text-muted-foreground">No performer/time reviews recorded.</p> : null}
      {query.data.proposals.length > 10 ? <EvidencePages page={page} next={query.data.proposals.length > (page + 1) * 10} onChange={setPage} /> : null}
      {proposalOpen ? <ProposalDialog work={workOrderId} specimen={specimenId} targets={targets} data={query.data} close={() => setProposalOpen(false)} refresh={refresh} /> : null}
      {review ? <ReviewDialog people={people} work={workOrderId} specimen={specimenId} proposal={review} close={() => setReview(null)} refresh={refresh} /> : null}
    </>}
  </section>
}

const proposalSchema = z.object({ target: z.string().min(1, 'Choose a step.'), performerId: z.string().min(1, 'Choose the actual performer.'), localTime: z.string(), occurrence: z.string(), reason: z.string().trim().min(1, 'Explain the proposed change.').max(4000), baseline: z.string().nullable() }).superRefine((value, context) => {
  const choices = localTimeOccurrences(value.localTime)
  const selected = choices.length === 1 ? choices[0] : choices.find(c => c.value === value.occurrence)
  if (!choices.length) context.addIssue({ code: 'custom', path: ['localTime'], message: 'Enter a valid local time; daylight-saving gaps cannot be used.' })
  else if (!selected) context.addIssue({ code: 'custom', path: ['occurrence'], message: 'Choose which occurrence of this repeated time you mean.' })
  else if (Date.parse(selected.value) > Date.now()) context.addIssue({ code: 'custom', path: ['localTime'], message: 'The performed time cannot be in the future.' })
})
function ProposalDialog({ work, specimen, targets, data, close, refresh }: { work: string; specimen: string; targets: Target[]; data: ReviewData; close: () => void; refresh: () => Promise<void> }) {
  const baseline = (record: string) => {
    const approved = data.proposals.filter(p => p.stepRecordId === record && data.decisions.some(d => d.id === p.id && d.approved))
    return approved.find(p => approved.every(other => other.basedOnProposalId !== p.id))?.id ?? null
  }
  const form = useForm<z.infer<typeof proposalSchema>>({ resolver: zodResolver(proposalSchema), defaultValues: { target: targets[0]?.recordId ?? '', baseline: baseline(targets[0]?.recordId ?? ''), performerId: '', localTime: '', occurrence: '', reason: '' } })
  const request = useRef<{ hash: string; id: string } | null>(null)
  const mutation = useMutation({ mutationFn: async (value: z.infer<typeof proposalSchema>) => {
    const target = targets.find(t => t.recordId === value.target)!
    const occurrences = localTimeOccurrences(value.localTime)
    const actual = occurrences.length === 1 ? occurrences[0].value : value.occurrence
    const input = { executionId: target.executionId, stepRecordId: target.recordId, performedByUserId: value.performerId, performedAt: actual, reason: value.reason, basedOnProposalId: value.baseline }
    const hash = JSON.stringify(input)
    if (request.current?.hash !== hash) request.current = { hash, id: crypto.randomUUID() }
    return proposePerformance(work, specimen, { ...input, requestId: request.current.id })
  }, onSuccess: async () => { await refresh(); close() } })
  const safeClose = () => { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard this unsaved performance proposal?'))) close() }
  const occurrences = localTimeOccurrences(form.watch('localTime'))
  return <Dialog open onOpenChange={open => { if (!open) safeClose() }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Propose performer/time change</DialogTitle><DialogDescription>Identify the actual work and explain the change. The original entry is retained; another supervisor must approve this proposal.</DialogDescription></DialogHeader>
    <form id="performance-proposal" className="space-y-4" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}>
      <div className="space-y-1.5"><Label htmlFor="performance-target"><RequiredFieldName>Original step</RequiredFieldName></Label><select id="performance-target" className={selectClass} {...form.register('target', { onChange: event => form.setValue('baseline', baseline(event.target.value)) })}>{targets.map(target => <option key={target.recordId} value={target.recordId}>{target.label}</option>)}</select></div>
      <Controller control={form.control} name="performerId" render={({ field }) => <PerformerPicker id="proposal-performer" value={field.value} onChange={field.onChange} error={form.formState.errors.performerId?.message} />} />
      <div className="space-y-1.5"><Label htmlFor="proposal-time"><RequiredFieldName>Actual date and time</RequiredFieldName></Label><p className="text-xs text-muted-foreground">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}. Recorded to the minute.</p><Input id="proposal-time" type="datetime-local" step={60} {...form.register('localTime')} aria-invalid={Boolean(form.formState.errors.localTime)} aria-describedby="proposal-time-error" /><FieldError id="proposal-time-error">{form.formState.errors.localTime?.message}</FieldError></div>
      {occurrences.length > 1 ? <div><Label htmlFor="proposal-occurrence"><RequiredFieldName>Which occurrence?</RequiredFieldName></Label><select id="proposal-occurrence" className={selectClass} {...form.register('occurrence')}><option value="">Choose an occurrence</option>{occurrences.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><FieldError>{form.formState.errors.occurrence?.message}</FieldError></div> : null}
      <div className="space-y-1.5"><Label htmlFor="proposal-reason"><RequiredFieldName>Reason and supporting evidence</RequiredFieldName></Label><Textarea id="proposal-reason" maxLength={4000} {...form.register('reason')} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="proposal-reason-error" /><FieldError id="proposal-reason-error">{form.formState.errors.reason?.message}</FieldError></div>
      {mutation.isError ? <EvidenceError error={mutation.error} /> : null}
    </form><RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={safeClose}>Cancel</Button><Button type="submit" form="performance-proposal" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit for review'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

const reviewSchema = z.object({ outcome: z.enum(['approve', 'reject']), reason: z.string().trim().min(1, 'Explain the review decision.').max(4000) })
function ReviewDialog({ work, specimen, proposal, close, refresh, people }: { people: ReadonlyMap<string, string>; work: string; specimen: string; proposal: PerformanceProposal; close: () => void; refresh: () => Promise<void> }) {
  const form = useForm<z.infer<typeof reviewSchema>>({ resolver: zodResolver(reviewSchema), defaultValues: { outcome: 'approve', reason: '' } })
  const mutation = useMutation({ mutationFn: (value: z.infer<typeof reviewSchema>) => decidePerformance(work, specimen, proposal.id, value.outcome === 'approve', value.reason), onSuccess: async () => { await refresh(); close() } })
  const safeClose = () => { if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard this unsaved review?'))) close() }
  return <Dialog open onOpenChange={open => { if (!open) safeClose() }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Review performer/time evidence</DialogTitle><DialogDescription>Compare the original entry, proposal and supporting evidence. Your decision is retained and cannot overwrite the original record.</DialogDescription></DialogHeader>
    <div className="grid gap-3 text-sm md:grid-cols-2"><div><h3 className="font-medium">Previous attribution</h3><Attribution json={proposal.originalPerformanceJson} people={people} /></div><div><h3 className="font-medium">Proposed attribution</h3><Attribution json={proposal.performanceJson} people={people} /></div></div><p className="whitespace-pre-wrap text-sm">Reason: {proposal.reason}</p>
    <form id="performance-review" className="space-y-4" noValidate onSubmit={form.handleSubmit(value => mutation.mutate(value))}><div><Label htmlFor="review-outcome"><RequiredFieldName>Decision</RequiredFieldName></Label><select id="review-outcome" className={selectClass} {...form.register('outcome')}><option value="approve">Approve</option><option value="reject">Reject</option></select></div><div><Label htmlFor="review-reason"><RequiredFieldName>Review explanation</RequiredFieldName></Label><Textarea id="review-reason" maxLength={4000} {...form.register('reason')} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby="review-reason-error" /><FieldError id="review-reason-error">{form.formState.errors.reason?.message}</FieldError></div>{mutation.isError ? <EvidenceError error={mutation.error} /> : null}</form>
    <RequiredDialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={safeClose}>Cancel</Button><Button form="performance-review" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save review decision'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

function Attribution({ json, people }: { json: string; people: ReadonlyMap<string, string> }) {
  try {
    const value = JSON.parse(json) as LabStepPerformance | null
    if (!value) return <p className="text-muted-foreground">No earlier verified attribution recorded.</p>
    return <div className="space-y-1 text-sm"><p>Performed by {people.get(value.performedByUserId) ?? `User ${value.performedByUserId}`}</p><p>{evidenceDate(value.performedAtUtc)} · {value.precision === 'minute' ? 'Minute precision' : 'Recorded time'}</p>{value.lateEntryReason ? <p className="whitespace-pre-wrap">Entry reason: {value.lateEntryReason}</p> : null}</div>
  } catch { return <EvidenceError error={new Error('The saved attribution could not be read. Investigate the original record.')} /> }
}
