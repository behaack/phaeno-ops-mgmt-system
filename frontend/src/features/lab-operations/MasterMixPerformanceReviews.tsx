import { LoadingState } from '#/components/ui/content-state'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api/client'
import type { MasterMix } from '#/api/lab-master-mix'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { Input } from '#/components/ui/input'
import { confirmPortal } from '#/components/PortalConfirmation'
import { EvidenceError } from './InvestigationEvidence'
import { StepPerformanceEvidence } from './StepPerformanceEvidence'

type Decision = { id: string; approved: boolean; reviewedByUserId: string; reason: string }
const schema = z.object({ outcome: z.enum(['approve', 'reject']), reason: z.string().trim().min(1).max(2000) })
export function MasterMixPerformanceReviews({ mix, canSupervise }: { mix: MasterMix; canSupervise: boolean }) {
  const query = useQuery({ queryKey: ['master-mix-performance', mix.id], queryFn: async () => (await api.get<{ data: Decision[] }>(`/platform/lab-operations/master-mixes/${mix.id}/performance-reviews`)).data.data })
  const [record, setRecord] = useState<string | null>(null)
  const people = new Map(mix.actors.map(actor => [actor.id, actor.name]))
  return <section className="space-y-3"><h2 className="text-base font-semibold">Step timing and participant verification</h2>{query.isError ? <EvidenceError error={query.error} /> : query.isPending ? <LoadingState label="Loading performance reviews…" /> : mix.recordedSteps.map(step => {
    let original = step
    const seen = new Set<string>()
    while (original.evidence.correctsRecordId && !seen.has(original.id)) { seen.add(original.id); const parent = mix.recordedSteps.find(r => r.evidence.id === original.evidence.correctsRecordId); if (!parent) break; original = parent }
    const decision = query.data.find(d => d.id === original.id)
    return <div key={step.id} className="space-y-2 rounded border p-3"><p className="text-sm font-medium">Step {step.sequence + 1}</p><StepPerformanceEvidence record={step.evidence} people={people} />{decision ? <p className="text-sm">{decision.approved ? 'Approved' : 'Rejected'} by {people.get(decision.reviewedByUserId) ?? decision.reviewedByUserId}: {decision.reason}</p> : step.evidence.performance?.verificationStatus === 'PendingReview' ? <><p className="text-sm">Independent review required before the mix becomes ready.</p>{canSupervise ? <Button variant="outline" onClick={() => setRecord(original.id)}>Review performance</Button> : null}</> : null}</div>
  })}{record ? <Review mixId={mix.id} recordId={record} close={() => setRecord(null)} /> : null}</section>
}
function Review({ mixId, recordId, close }: { mixId: string; recordId: string; close: () => void }) {
  const client = useQueryClient()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { outcome: 'approve', reason: '' } })
  const save = useMutation({ mutationFn: (value: z.infer<typeof schema>) => api.post(`/platform/lab-operations/master-mixes/${mixId}/steps/${recordId}/performance-review`, { approved: value.outcome === 'approve', reason: value.reason }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['master-mix-performance', mixId] }); close() } })
  const safeClose = async () => { if (!save.isPending && (!form.formState.isDirty || await confirmPortal('Discard this unsaved review?'))) close() }
  return <Dialog open onOpenChange={open => { if (!open) void safeClose() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); (event.target as HTMLElement).querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button')?.focus() }}><DialogHeader><DialogTitle>Review recorded performance</DialogTitle><DialogDescription>A supervisor other than the recorder confirms the actual performance and participants. The original evidence remains.</DialogDescription></DialogHeader><form id="mix-performance-review" className="space-y-3" noValidate onSubmit={form.handleSubmit(value => save.mutate(value))}><Field><Label htmlFor="mix-performance-outcome"><RequiredFieldName>Decision</RequiredFieldName></Label><NativeSelect id="mix-performance-outcome" {...form.register('outcome')}><option value="approve">Approve</option><option value="reject">Reject</option></NativeSelect></Field><Field><Label htmlFor="mix-performance-reason"><RequiredFieldName>Review evidence and reason</RequiredFieldName></Label><Input id="mix-performance-reason" {...form.register('reason')} /><FieldError>{form.formState.errors.reason?.message}</FieldError></Field>{save.isError ? <EvidenceError error={save.error} /> : null}</form><RequiredDialogFooter><Button variant="outline" disabled={save.isPending} onClick={() => void safeClose()}>Cancel</Button><Button type="submit" form="mix-performance-review" disabled={save.isPending}>Save decision</Button></RequiredDialogFooter></DialogContent></Dialog>
}
