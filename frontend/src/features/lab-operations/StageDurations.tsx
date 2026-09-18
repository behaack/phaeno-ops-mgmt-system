import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { applyTimingPolicy, getForecastConfiguration, previewTimingPolicy, saveTimingPolicy, type ForecastCalendar, type ForecastPreviewJob, type TimingWorkflow } from '#/api/lab-forecasts'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { PreparationActions, PreparationField, PreparationPanel, prepRowClass, prepSelectClass } from './preparation-ui'
import { formatCalendarDate } from './calendar-date'

function Failure({ error }: { error: unknown }) { return error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(error, 'The request could not be completed. Reload and try again.')}</p> : null }
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleString() : 'Not available' }

export function StageDurations() {
  const query = useQuery({ queryKey: ['lab-forecast-configuration'], queryFn: getForecastConfiguration })
  const [workflowId, setWorkflowId] = useState('')
  const [edit, setEdit] = useState<'durations' | 'apply' | null>(null)
  if (query.isPending) return <p role="status">Loading stage durations…</p>
  if (query.isError) return <><Failure error={query.error} /><Button variant="outline" onClick={() => void query.refetch()}>Reload</Button></>
  const { workflows, calendars, canConfigure } = query.data
  const workflow = workflows.find(w => w.id === workflowId) ?? workflows[0]
  const policy = workflow?.policies[0]
  const calendar = calendars[0]
  const activeCalendar = calendars.find(c => c.id === policy?.labBusinessCalendarId)
  return <div className="space-y-4">
    <PreparationPanel title="Stage durations" description="Estimate remaining work using each stage’s duration and day basis. New versions preserve settings already assigned to jobs." actions={canConfigure && workflow ? <PreparationActions items={[
      { label: policy ? 'Edit durations' : 'Configure durations', onClick: () => setEdit('durations'), disabled: !calendar },
      ...(policy ? [{ label: 'Preview and apply to jobs', onClick: () => setEdit('apply') }] : []),
    ]} /> : undefined} headerContent={<>
      <div className="space-y-1"><Label htmlFor="timing-workflow">Workflow version</Label><select id="timing-workflow" className={prepSelectClass} value={workflow?.id ?? ''} onChange={e => setWorkflowId(e.target.value)}>{workflows.map(w => <option key={w.id} value={w.id}>{w.name} · v{w.workflowVersion} · {w.status}</option>)}</select></div>
      {!calendar ? <p className="text-sm">Configure a calendar in the Holiday calendar tab before setting stage durations.</p> : null}
      {workflow ? <p className="text-sm text-muted-foreground">{policy ? `Timing revision ${policy.revision} · Calendar revision ${activeCalendar?.revision ?? 'unknown'}` : 'No timing policy configured.'}</p> : null}
    </>}>
      {workflow ? <>
        <ul className="space-y-2" aria-label="Stage durations">{workflow.stages.map(stage => {
          const duration = policy?.durations.find(d => d.stageKey === stage.key)
          const omitted = policy && !policy.requiresSequencing && ['library-qc', 'sequencing'].includes(stage.key)
          return <li key={stage.key} className={`${prepRowClass} flex flex-wrap justify-between gap-2`}><div><p className="font-medium">{stage.name}</p><p className="text-xs text-muted-foreground">{stage.requirement}</p></div><span className="text-sm">{omitted ? 'Not applicable' : duration ? `${duration.days} ${duration.dayBasis === 'Business' ? 'business' : 'calendar'} days` : 'Not configured'}</span></li>
        })}</ul>
        {policy ? <p className="text-xs text-muted-foreground">{policy.reason}</p> : null}
      </> : <p>No workflow versions are available. Configure a workflow first.</p>}
    </PreparationPanel>
    {edit === 'durations' && workflow && calendar ? <DurationDialog workflow={workflow} calendars={calendars} onClose={() => setEdit(null)} /> : null}
    {edit === 'apply' && policy ? <ApplyDialog policyId={policy.id} onClose={() => setEdit(null)} /> : null}
  </div>
}

const policySchema = z.object({ calendarId: z.string().min(1), requiresSequencing: z.boolean(), reason: z.string().trim().min(1, 'Enter a reason.').max(2000), rows: z.array(z.object({ key: z.string(), days: z.string().refine(v => v === '' || /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 365, 'Use 0–365 days, with at most two decimals.'), basis: z.enum(['Calendar', 'Business']) })) })
function DurationDialog({ workflow, calendars, onClose }: { workflow: TimingWorkflow; calendars: ForecastCalendar[]; onClose: () => void }) {
  const policy = workflow.policies[0]; const client = useQueryClient()
  const form = useForm<z.infer<typeof policySchema>>({ resolver: zodResolver(policySchema), defaultValues: { calendarId: policy?.labBusinessCalendarId ?? calendars[0].id, requiresSequencing: policy?.requiresSequencing ?? true, reason: '', rows: workflow.stages.map(s => { const d = policy?.durations.find(x => x.stageKey === s.key); return { key: s.key, days: d ? String(d.days) : '', basis: d?.dayBasis ?? 'Calendar' } }) } })
  const save = useMutation({ mutationFn: (v: z.infer<typeof policySchema>) => saveTimingPolicy(workflow.id, { previousId: policy?.id ?? null, calendarId: v.calendarId, requiresSequencing: v.requiresSequencing, reason: v.reason, durations: v.rows.filter(r => r.days !== '').map(r => ({ stageKey: r.key, days: Number(r.days), dayBasis: r.basis })) }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['lab-forecast-configuration'] }); onClose() } })
  return <Dialog open onOpenChange={v => { if (!v && !save.isPending) onClose() }}><DialogContent className="sm:max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(v => save.mutate(v))}>
    <DialogHeader><DialogTitle>Stage durations · {workflow.name} v{workflow.workflowVersion}</DialogTitle><DialogDescription>Blank means not configured; zero means immediate. Include normal waiting time. Existing jobs change only after preview and explicit application.</DialogDescription></DialogHeader>
    <div className="max-h-[60vh] space-y-4 overflow-y-auto p-1"><Failure error={save.error} />
      <PreparationField id="policy-calendar" label="Holiday calendar" required><select id="policy-calendar" className={prepSelectClass} {...form.register('calendarId')}>{calendars.map(c => <option key={c.id} value={c.id}>Revision {c.revision} · {formatCalendarDate(c.coverageFrom)} – {formatCalendarDate(c.coverageTo)}</option>)}</select></PreparationField>
      <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register('requiresSequencing')} />This workflow requires library QC and external sequencing after its protocol stages.</label>
      {workflow.stages.map((stage, i) => <fieldset key={stage.key} className="rounded-md border p-3"><legend className="px-1 text-sm font-medium">{stage.name}</legend><div className="grid gap-3 sm:grid-cols-2"><PreparationField id={`duration-${i}`} label="Estimated days" error={form.formState.errors.rows?.[i]?.days?.message}><Input id={`duration-${i}`} type="number" min="0" max="365" step="0.01" {...form.register(`rows.${i}.days`)} /></PreparationField><PreparationField id={`basis-${i}`} label="Day basis" required><select id={`basis-${i}`} className={prepSelectClass} {...form.register(`rows.${i}.basis`)}><option value="Calendar">Calendar days</option><option value="Business">Business days</option></select></PreparationField></div></fieldset>)}
      <PreparationField id="policy-reason" label="Reason for this revision" required error={form.formState.errors.reason?.message}><Input id="policy-reason" {...form.register('reason')} /></PreparationField>
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button disabled={save.isPending}>Save durations</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}

const applySchema = z.object({ reason: z.string().trim().min(1, 'Enter a reason.').max(2000) })
function ApplyDialog({ policyId, onClose }: { policyId: string; onClose: () => void }) {
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<ForecastPreviewJob[]>([]); const client = useQueryClient()
  const preview = useQuery({ queryKey: ['lab-forecast-preview', policyId, page], queryFn: () => previewTimingPolicy(policyId, page) })
  const form = useForm<z.infer<typeof applySchema>>({ resolver: zodResolver(applySchema), defaultValues: { reason: '' } })
  const save = useMutation({ mutationFn: (v: z.infer<typeof applySchema>) => applyTimingPolicy({ policyId, reason: v.reason, jobs: selected.map(j => ({ jobId: j.id, version: j.version, previousPolicyId: j.currentPolicyId })) }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['lab-jobs'] }), client.invalidateQueries({ queryKey: ['lab-job-deadline'] }), client.invalidateQueries({ queryKey: ['lab-completion-forecast'] })]); onClose() } })
  return <Dialog open onOpenChange={v => { if (!v && !save.isPending) onClose() }}><DialogContent className="sm:max-w-2xl"><form className="contents" noValidate onSubmit={form.handleSubmit(v => save.mutate(v))}>
    <DialogHeader><DialogTitle>Preview timing changes</DialogTitle><DialogDescription>Select jobs to apply this revision. Delivery commitments and customer notifications are unchanged.</DialogDescription></DialogHeader>
    <div className="max-h-[60vh] space-y-3 overflow-y-auto p-1"><Failure error={preview.error ?? save.error} />{preview.isPending ? <p role="status">Calculating preview…</p> : null}
      {preview.data?.jobs.map(j => <label key={j.id} aria-label={`Apply timing policy to ${j.name}`} htmlFor={`forecast-job-${j.id}`} className={`${prepRowClass} flex cursor-pointer items-start gap-3`}><input id={`forecast-job-${j.id}`} type="checkbox" className="mt-1" checked={selected.some(s => s.id === j.id)} onChange={e => setSelected(old => e.target.checked ? [...old, j] : old.filter(s => s.id !== j.id))} /><span className="space-y-1 text-sm"><span className="block font-medium">{j.name}</span><span className="block">Current: {dateLabel(j.current.expectedAtUtc)}</span><span className="block">Proposed: {dateLabel(j.proposed.expectedAtUtc)}</span><span className="block text-muted-foreground">{j.proposed.reason}</span></span></label>)}
      {preview.data?.total === 0 ? <p>No unfinished jobs use this workflow.</p> : null}
      <div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={page === 1 || save.isPending} onClick={() => { setSelected([]); setPage(p => p - 1) }}>Previous</Button><span className="text-sm">Page {page}</span><Button type="button" variant="outline" disabled={!preview.data || page * 25 >= preview.data.total || save.isPending} onClick={() => { setSelected([]); setPage(p => p + 1) }}>Next</Button></div>
      <PreparationField id="apply-reason" label="Reason" required error={form.formState.errors.reason?.message}><Input id="apply-reason" {...form.register('reason')} /></PreparationField>
    </div><RequiredDialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button disabled={save.isPending || selected.length === 0}>Apply to {selected.length} jobs</Button></RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
