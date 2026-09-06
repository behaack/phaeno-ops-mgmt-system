import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
import axios from 'axios'
import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getLabExecution, getLabOperationsError, recordLabExecutionStep, transitionLabExecution, type LabExecutionDetail, type LabExecutionStepInput } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { usePhaenoSession } from '#/features/auth/session-context'

import { ExecutionStepDialog } from './ExecutionStepDialog'

export function LabExecutionPage({ executionId }: { executionId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canManageLabOperations)
  const client = useQueryClient()
  const [recovery, setRecovery] = useState<string>()
  const queryKey = ['lab-execution', executionId]
  const execution = useQuery({ queryKey, queryFn: () => getLabExecution(executionId), enabled: canView && authProvider !== 'mock' })
  const refreshRelated = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['lab-work-order', execution.data?.workOrderId] }),
      client.invalidateQueries({ queryKey: ['lab-operations'] }),
    ])
  }
  const recover = async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const result = await execution.refetch()
      setRecovery(result.isError ? 'The current record could not be reloaded. Your values are preserved; reload before trying again.' : 'The latest execution is loaded. Your entered values are preserved. Review the current step history before saving again.')
    }
  }
  const record = useMutation({
    mutationFn: (input: LabExecutionStepInput) => recordLabExecutionStep(executionId, input),
    onSuccess: async data => { client.setQueryData(queryKey, data); setRecovery(undefined); await refreshRelated() },
    onError: recover,
  })
  const transition = useMutation({
    mutationFn: ({ action, note }: { action: 'start' | 'complete' | 'abandon'; note?: string }) => transitionLabExecution(executionId, { action, deviationNote: note || null, version: execution.data!.execution.version }),
    onSuccess: async () => { setRecovery(undefined); await execution.refetch(); await refreshRelated() },
    onError: recover,
  })
  if (!canView || authProvider === 'mock') return <main className="page-wrap p-6"><Alert><AlertTitle>Connected laboratory session required</AlertTitle><AlertDescription>Open this execution with an authorized Phaeno laboratory account.</AlertDescription></Alert></main>
  if (execution.isLoading) return <main className="page-wrap p-6"><p role="status">Loading protocol execution…</p></main>
  if (!execution.data) return <main className="page-wrap p-6"><Alert variant="destructive"><AlertTitle>Execution could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(execution.error, 'Reload the execution and try again.')}</AlertDescription></Alert><Button className="mt-4" onClick={() => void execution.refetch()}>Reload execution</Button></main>
  const error = record.error ?? transition.error
  return <LabExecutionWorkspace data={execution.data} pending={record.isPending || transition.isPending}
    error={error ? `${getLabOperationsError(error, 'The laboratory action could not be saved.')} ${recovery ?? ''}` : undefined}
    returnLink={<Link to="/lab-operations/$workOrderId" params={{ workOrderId: execution.data.workOrderId }} search={{ section: 'work', tab: 'execution' }} className="text-sm text-primary underline underline-offset-4">Back to laboratory job</Link>}
    onRecord={async input => { await record.mutateAsync(input) }}
    onTransition={async (action, note) => { await transition.mutateAsync({ action, note }) }} />
}

export function LabExecutionWorkspace({ data, returnLink, pending, error, onRecord, onTransition }: {
  data: LabExecutionDetail; returnLink: ReactNode; pending: boolean; error?: string
  onRecord: (input: LabExecutionStepInput) => Promise<void>
  onTransition: (action: 'start' | 'complete' | 'abandon', note?: string) => Promise<void>
}) {
  const [target, setTarget] = useState<{ key: string; action: LabExecutionStepInput['action'] } | null>(null)
  const [finish, setFinish] = useState<'complete' | 'abandon' | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const returnFocus = () => (trigger.current?.isConnected ? trigger.current : heading.current)?.focus()
  const selected = data.steps.find(step => step.definition.key === target?.key)
  const active = ['InProgress', 'Blocked'].includes(data.execution.status)
  const completed = data.execution.status === 'Completed'
  const recorders = new Map(data.recorders.map(actor => [actor.id, actor.name]))
  const open = (key: string, action: LabExecutionStepInput['action']) => { trigger.current = document.activeElement as HTMLElement; setTarget({ key, action }) }
  const openFinish = (action: 'complete' | 'abandon') => { trigger.current = document.activeElement as HTMLElement; setFinish(action) }

  return <main className="page-wrap space-y-6 px-4 py-8">
    {returnLink}
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold break-words">{data.protocolName}</h1><p className="mt-2 text-sm text-muted-foreground">Protocol version {data.protocolVersion}{data.accessionNumber ? ` · Specimen ${data.accessionNumber}` : ' · Job-level execution'}</p><Badge variant="outline" className="mt-2">{data.execution.status === 'InProgress' ? 'In progress' : data.execution.status}</Badge></div>
      <div className="flex flex-wrap gap-2">
        {data.canAbandon ? <Button variant="outline" disabled={pending} onClick={() => openFinish('abandon')}>Abandon execution</Button> : null}
        {data.canOperate && data.execution.status === 'Planned' ? <Button disabled={pending} onClick={() => void onTransition('start').catch(() => {})}>{pending ? 'Starting…' : 'Start execution'}</Button> : null}
        {data.canOperate && active ? <Button disabled={pending || data.completionBlockers.length > 0} onClick={() => openFinish('complete')}>Complete execution</Button> : null}
      </div>
    </header>
    {error && !target && !finish ? <Alert variant="destructive"><AlertTitle>Execution was not updated</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    {data.recoveryMessage ? <Alert variant="destructive"><AlertTitle>Historical record needs review</AlertTitle><AlertDescription>{data.recoveryMessage}</AlertDescription></Alert> : null}
    {(active || data.execution.status === 'Planned' && !data.canOperate) && data.completionBlockers.length > 0 ? <Alert><AlertTitle>Before this execution can complete</AlertTitle><AlertDescription><ul className="list-disc space-y-1 pl-4">{data.completionBlockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></AlertDescription></Alert> : null}
    {completed ? <p role="status" className="rounded-lg border p-4 text-sm">Completed {formatTime(data.execution.completedAtUtc)}. This execution and its evidence are locked.</p> : null}
    {data.execution.deviationNote ? <section><h2 className="font-medium">{data.execution.status === 'Abandoned' ? 'Abandonment reason' : 'Deviation note'}</h2><p className="mt-2 whitespace-pre-wrap text-sm">{data.execution.deviationNote}</p></section> : null}
    <section aria-labelledby="execution-steps"><h2 id="execution-steps" className="text-lg font-semibold">Procedure and evidence</h2><p className="mt-1 text-sm text-muted-foreground">Record steps in order. Every optional or conditional step needs an explicit decision. A changed earlier step requires fresh review of later evidence.</p>
      <ol className="mt-4 divide-y rounded-lg border bg-card px-4">
        {data.steps.map((step, index) => {
          const latest = step.records.at(-1)
          const def = step.definition
          return <li key={def.key} className="space-y-3 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold break-words">{index + 1}. {def.name}</h3><p className="mt-1 text-xs text-muted-foreground">{def.condition ? 'Conditional' : def.required ? 'Required' : 'Optional'}{def.requiredRole ? ` · ${def.requiredRole}` : ''}{def.repeatable ? ' · Repeat allowed' : ''}</p></div><Badge variant="outline">{latest ? latest.outcome === 'skipped' ? 'Skipped' : latest.qcOutcome ? `QC ${latest.qcOutcome}` : 'Recorded' : 'Not recorded'}</Badge></div>
            <p className="whitespace-pre-wrap text-sm leading-6">{def.instructions}</p>
            {def.condition ? <p className="text-sm"><strong>Condition:</strong> {def.condition}</p> : null}
            {def.qcGate ? <p className="text-sm"><strong>QC:</strong> {def.qcGate.criteria}</p> : null}
            {def.inputMaterials.length > 0 ? <p className="text-sm"><strong>Inputs:</strong> {def.inputMaterials.join(', ')}</p> : null}
            {def.preparedOutputs.length > 0 ? <p className="text-sm"><strong>Outputs:</strong> {def.preparedOutputs.join(', ')}</p> : null}
            {def.equipmentTypes.length > 0 ? <p className="text-sm"><strong>Equipment:</strong> {def.equipmentTypes.join(', ')}</p> : null}
            {latest ? <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
              {def.captures.filter(capture => latest.captures[capture.key] !== undefined).map(capture => <p key={capture.key} className="break-words"><strong>{capture.label}:</strong> {String(latest.captures[capture.key])}{capture.unit ? ` ${capture.unit}` : ''}</p>)}
              {latest.reason ? <p className="whitespace-pre-wrap"><strong>Reason:</strong> {latest.reason}</p> : null}
              <p className="text-xs text-muted-foreground">{recorders.get(latest.recordedByUserId) ?? 'Recorded operator'} · {formatTime(latest.recordedAtUtc)}</p>
            </div> : null}
            {active && step.actionBlocker ? <p className="text-xs text-muted-foreground">{step.actionBlocker}</p> : null}
            <div className="flex flex-wrap gap-2">
              {step.canRecord ? <Button size="sm" disabled={pending} onClick={() => open(def.key, 'record')}>Record {def.name}</Button> : null}
              {step.canRepeat ? <Button size="sm" variant="outline" disabled={pending} onClick={() => open(def.key, 'repeat')}>Repeat {def.name}</Button> : null}
              {step.canCorrect ? <Button size="sm" variant="outline" disabled={pending} onClick={() => open(def.key, 'correct')}>Correct {def.name}</Button> : null}
            </div>
            {step.records.length > 0 ? <details className="text-sm"><summary className="cursor-pointer font-medium">Step history ({step.records.length})</summary><ol className="mt-3 space-y-3 border-l pl-4">{step.records.map((record, recordIndex) => <li key={record.id} className="space-y-1 break-words"><p className="font-medium">{recordIndex + 1}. {record.action} · {record.outcome}{record.qcOutcome ? ` · QC ${record.qcOutcome}` : ''}</p>{def.captures.filter(capture => record.captures[capture.key] !== undefined).map(capture => <p key={capture.key}>{capture.label}: {String(record.captures[capture.key])}{capture.unit ? ` ${capture.unit}` : ''}</p>)}{record.reason ? <p className="whitespace-pre-wrap">{record.reason}</p> : null}{record.operatorConfirmed ? <p>Operator confirmation recorded.</p> : null}{record.resourcesConfirmed ? <p>Resource traceability confirmed.</p> : null}<p className="text-xs text-muted-foreground">{recorders.get(record.recordedByUserId) ?? 'Recorded operator'} · {formatTime(record.recordedAtUtc)}</p></li>)}</ol></details> : null}
          </li>
        })}
      </ol>
    </section>
    <section className="space-y-3" aria-labelledby="execution-resources"><h2 id="execution-resources" className="text-lg font-semibold">Recorded material and equipment use</h2><p className="text-sm text-muted-foreground">Use Material and Equipment on the laboratory job to record lot quantities, output containers, and equipment use before confirming resources.</p>{[...data.materialUse, ...data.equipmentUse].map(resource => <p key={resource.id} className="text-sm"><strong>{resource.name}</strong> · {resource.details} · {formatTime(resource.recordedAtUtc)}</p>)}{data.materialUse.length + data.equipmentUse.length === 0 ? <p className="text-sm text-muted-foreground">No material or equipment use has been recorded.</p> : null}</section>
    {data.recoveryMessage ? <details><summary className="cursor-pointer text-sm font-medium">Preserved historical results</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{data.execution.capturedResultsJson}</pre></details> : null}
    {target && selected ? <ExecutionStepDialog key={`${target.key}-${target.action}`} step={selected} action={target.action} version={data.execution.version} pending={pending} error={error} onClose={() => setTarget(null)} onSave={onRecord} onReturnFocus={returnFocus} /> : null}
    {finish ? <ExecutionFinishDialog action={finish} name={data.protocolName} pending={pending} error={error} onClose={() => setFinish(null)} onReturnFocus={returnFocus} onSave={async note => { await onTransition(finish, note); setFinish(null) }} /> : null}
  </main>
}

function ExecutionFinishDialog({ action, name, pending, error, onClose, onSave, onReturnFocus }: {
  action: 'complete' | 'abandon'; name: string; pending: boolean; error?: string; onClose: () => void; onSave: (note: string) => Promise<void>; onReturnFocus: () => void
}) {
  const abandon = action === 'abandon'
  const form = useForm<{ note: string }>({ resolver: zodResolver(z.object({ note: z.string().trim().max(4000).min(abandon ? 1 : 0, 'Enter the reason for abandoning this execution.') })), defaultValues: { note: '' }, mode: 'onBlur' })
  useBlocker({
    shouldBlockFn: () => pending || form.formState.isDirty && !window.confirm('Discard the unsaved note?'),
    enableBeforeUnload: () => form.formState.isDirty || pending,
  })
  const close = () => { if (!pending && (!form.formState.isDirty || window.confirm('Discard the unsaved note?'))) onClose() }
  return <Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus() }}><DialogHeader><DialogTitle>{abandon ? 'Abandon' : 'Complete'} {name}?</DialogTitle><DialogDescription>{abandon ? 'This stops the execution and retains every recorded step. Record a reason; further work requires a new execution.' : 'The server will check the saved step evidence and QC. Completion locks the execution and preserves its history.'}</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="finish-execution" noValidate onSubmit={form.handleSubmit(async values => { try { await onSave(values.note) } catch { /* Keep entered values and show API feedback. */ } })}><Label htmlFor="finish-note">{abandon ? <RequiredFieldName>Reason</RequiredFieldName> : 'Deviation note (optional)'}</Label><Textarea className="mt-1.5" id="finish-note" rows={4} maxLength={4000} aria-invalid={Boolean(form.formState.errors.note)} {...form.register('note')} /><FieldError>{form.formState.errors.note?.message}</FieldError></form><RequiredDialogFooter showLegend={abandon}><Button variant="outline" onClick={close} disabled={pending}>Cancel</Button><Button type="submit" form="finish-execution" variant={abandon ? 'destructive' : 'default'} disabled={pending}>{pending ? 'Saving…' : abandon ? 'Abandon execution' : 'Confirm completion'}</Button></RequiredDialogFooter></DialogContent></Dialog>
}

function formatTime(value: string | null) { return value ? new Date(value).toLocaleString() : '—' }
