import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { executionSteps, getResultLineage, getSampleInvestigation, type EvidenceRow } from '#/api/lab-investigation'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { EvidenceDetails, EvidenceError, EvidenceList, evidenceDate, evidenceLabel } from './InvestigationEvidence'
import { InvestigationReports } from './InvestigationReports'
import { InvestigationEventHistory } from './InvestigationEventHistory'
import { InvestigationAttachments } from './InvestigationAttachments'
import { PerformanceReviews } from './PerformanceReviews'
import { RelatedInvestigationSamples } from './RelatedInvestigationSamples'
import { StepPerformanceEvidence } from './StepPerformanceEvidence'
import { ScientificEvidenceList } from './ScientificEvidencePage'

export function SampleInvestigation({ workOrderId, specimenId }: { workOrderId: string; specimenId: string }) {
  const query = useQuery({ queryKey: ['sample-investigation', workOrderId, specimenId], queryFn: () => getSampleInvestigation(workOrderId, specimenId) })
  const [resultId, setResultId] = useState('')
  const data = query.data
  const results = [...(data?.evidence.results ?? []), ...(data?.evidence.legacyResults ?? [])]
  const people = new Map((data?.evidence.people ?? []).map(person => [person.id, String(person.name)]))
  return <Card className="gap-0 py-0" id="sample-history">
    <CardHeader className="border-b bg-muted/50 p-4"><div className="flex items-start justify-between gap-3"><div><CardTitle role="heading" aria-level={2}>Sample history</CardTitle><CardDescription className="mt-1">Review source tubes, laboratory work and the evidence behind a specific result.</CardDescription></div><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reload evidence</Button></div></CardHeader>
    <CardContent className="space-y-4 p-4">
      {query.isPending ? <p role="status">Loading sample history…</p> : query.isError ? <EvidenceError error={query.error} /> : data ? <>
        <p className="text-xs text-muted-foreground">As of {evidenceDate(data.capturedAtUtc)}. Recorded evidence is not a certification of scientific validity.</p>
        <div className="grid gap-3 md:grid-cols-2">{data.coverage.map(item => <div key={item.area} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{item.area}</h3><Badge variant="outline">{item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.explanation}</p></div>)}</div>
        <section aria-label="Result traceability" className="space-y-3"><h3 className="font-medium">Trace a result to its tube</h3>{results.length ? <>
          <Label htmlFor={`trace-result-${specimenId}`}>Result version</Label><select id={`trace-result-${specimenId}`} className="h-9 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm" value={resultId} onChange={event => setResultId(event.target.value)}><option value="">Select a result</option>{results.map(result => <option key={result.id} value={result.id}>Version {String(result.packageVersion ?? result.releaseVersion ?? 'Unknown')} · {result.id}</option>)}</select>
          {resultId ? <ResultTrace key={resultId} workOrderId={workOrderId} specimenId={specimenId} resultId={resultId} /> : null}
        </> : <p className="text-sm text-muted-foreground">No results have been recorded for this sample.</p>}</section>
        <details className="rounded-lg border"><summary className="cursor-pointer bg-muted/50 p-3 text-sm font-medium">Protocol work ({data.evidence.executions?.length ?? 0})</summary><div className="space-y-4 p-3">{(data.evidence.executions ?? []).map(execution => <section key={execution.id} className="space-y-2 border-b pb-3"><Link className="text-sm text-primary underline" to="/lab-operations/executions/$executionId" params={{ executionId: execution.id }} search={{ section: 'jobs' }}>Open protocol execution · {String(execution.status)}</Link><ExecutionHistory execution={execution} people={people} /></section>)}</div></details>
        <ScientificEvidenceList workOrderId={workOrderId} specimenId={specimenId} />
        {(['materials', 'equipment', 'libraries', 'analysisInputs', 'artifacts', 'approvals', 'exceptions', 'custody'] as const).map(section => <EvidenceList key={section} title={evidenceLabel(section)} rows={data.evidence[section] ?? []} />)}
        <section aria-label="Delivery and retention history" className="space-y-3"><h3 className="font-medium">Delivery and retention history</h3><p className="text-xs text-muted-foreground">All recorded versions for this sample. An attempted download is not a completed transfer; a completed transfer does not prove the recipient read the file. Shared Trial releases describe the package containing this sample and omit other samples’ files.</p>
          {Object.entries({ trialReleases: 'Trial releases', delivery: 'Delivery events', downloads: 'Download attempts', downloadCommitEvidence: 'Verified download timing', retentionSchedules: 'Retention schedules', retention: 'File retention', preservationHolds: 'Preservation holds', reissues: 'Reissues' }).map(([key, title]) => <EvidenceList key={key} title={title} rows={(data.evidence[key] ?? []).map(row => Object.fromEntries(Object.entries(row).map(([field, value]) => [field, typeof value === 'string' && /(?:UserId|^userId)$/.test(field) && people.has(value) ? `${people.get(value)} (${value})` : value])) as EvidenceRow)} />)}
        </section>
        <InvestigationAttachments key={`attachments-${data.capturedAtUtc}`} workOrderId={workOrderId} specimenId={specimenId} rows={data.evidence.attachments ?? []} />
        <PerformanceReviews workOrderId={workOrderId} specimenId={specimenId} executions={data.evidence.executions ?? []} people={people} />
        <EvidenceList title="Scientific requirement assessment" rows={data.evidence.scientificRequirements ?? []} />
        <InvestigationEventHistory key={data.capturedAtUtc} workOrderId={workOrderId} specimenId={specimenId} through={data.capturedAtUtc} />
        <RelatedInvestigationSamples workOrderId={workOrderId} />
      </> : null}
      <InvestigationReports workOrderId={workOrderId} specimenId={specimenId} canGenerate={Boolean(data && !query.isError && data.limitedSections.length === 0)} />
    </CardContent>
  </Card>
}
function ExecutionHistory({ execution, people }: { execution: EvidenceRow; people: ReadonlyMap<string, string> }) {
  try {
    const records = executionSteps(execution)
    return <>{records.map(record => <details key={record.id} className="rounded-md border p-3"><summary className="cursor-pointer text-sm">{record.stepKey} · {evidenceLabel(record.action)} · {evidenceLabel(record.outcome)}</summary><div className="mt-2 space-y-2"><StepPerformanceEvidence record={record} people={people} /><EvidenceDetails value={record.captures} />{record.reason ? <p className="text-sm">Reason: {record.reason}</p> : null}</div></details>)}{!records.length ? <p className="text-xs text-muted-foreground">No structured step evidence recorded.</p> : null}</>
  } catch { return <EvidenceError error={new Error('The saved step evidence could not be read. Open the execution and investigate this record.')} /> }
}
function ResultTrace({ workOrderId, specimenId, resultId }: { workOrderId: string; specimenId: string; resultId: string }) {
  const query = useQuery({ queryKey: ['result-lineage', workOrderId, specimenId, resultId], queryFn: () => getResultLineage(workOrderId, specimenId, resultId) })
  if (query.isPending) return <p role="status">Loading result lineage…</p>
  if (query.isError) return <EvidenceError error={query.error} />
  const data = query.data
  return <div className="space-y-3 rounded-lg border p-3"><Badge variant="outline">{evidenceLabel(data.coverage)}</Badge>{data.sourceBarcode ? <p className="text-sm font-medium">Source tube: {data.sourceBarcode}</p> : <p className="text-sm">The exact source tube was not recorded for this result. It will not be inferred from current work.</p>}{data.analysisRun ? <EvidenceList title="Producing analysis" rows={[data.analysisRun]} /> : null}<EvidenceList title="Sequencing inputs" rows={data.inputs} /><EvidenceList title="Result files and attribution" rows={data.artifacts} /></div>
}
