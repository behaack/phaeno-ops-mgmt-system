import type { LabServiceOrder } from '#/api/order-management'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { customerLabStageLabels, customerLabStages } from './lab-customer-progress'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'

export function LabCustomerProgressPanel({ order }: { order: LabServiceOrder }) {
  const progress = order.laboratoryProgress
  if (!progress) return <Card><CardHeader><CardTitle>Laboratory progress</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Detailed laboratory progress is not currently available.</p></CardContent></Card>
  const count = (stage: string) => progress.counts.find(item => item.stage === stage)?.count ?? 0
  const otherCounts = progress.counts.filter(item => !customerLabStages.some(stage => stage === item.stage))
  const names = new Map(order.samples.map(sample => [sample.id, sample.customerSampleId]))
  return <Card>
    <CardHeader><CardTitle>Laboratory progress</CardTitle><CardDescription>Current sample stages. Samples may move through the laboratory at different times.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><OrderStatusBadge status={progress.currentStage} />
        {order.labScheduleHealth ? <span className="text-sm text-muted-foreground">Schedule: {humanizeStatus(order.labScheduleHealth)}</span> : null}
        {order.labExpectedCompletionAtUtc ? <span className="text-sm text-muted-foreground">Expected {new Date(order.labExpectedCompletionAtUtc).toLocaleDateString()}</span> : null}
      </div>
      <ol aria-label="Laboratory stages" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {customerLabStages.map(stage => <li key={stage} aria-current={progress.currentStage === stage ? 'step' : undefined}
          className={`rounded-md border p-3 ${progress.currentStage === stage ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
          <p className="text-sm font-medium">{customerLabStageLabels[stage]}</p>
          <p className="mt-1 text-sm text-muted-foreground">{count(stage)} {count(stage) === 1 ? 'sample' : 'samples'}</p>
          {progress.currentStage === stage ? <span className="text-xs font-medium text-primary">Current Job stage</span> : null}
        </li>)}
      </ol>
      {otherCounts.length ? <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">{otherCounts.map(item => <li key={item.stage}>{customerLabStageLabels[item.stage] ?? humanizeStatus(item.stage)}: {item.count} {item.count === 1 ? 'sample' : 'samples'}</li>)}</ul> : null}
      {progress.hasContainerReceipt && count('AwaitingReceipt') > 0 ? <p className="text-sm text-muted-foreground">A container has arrived. Individual sample receipt is confirmed as its tubes are verified.</p> : null}
      {progress.jobStage && progress.jobStage !== progress.currentStage && progress.jobStage !== 'Received' ? <p className="text-sm text-muted-foreground">Latest Job-wide activity: {customerLabStageLabels[progress.jobStage] ?? humanizeStatus(progress.jobStage)}. Sample counts show individually recorded progress.</p> : null}
      {progress.jobStage === progress.currentStage && count(progress.currentStage) === 0 ? <p className="text-sm text-muted-foreground">This stage was recorded for the Job. Individual sample counts will update when sample-level activity is recorded.</p> : null}
      {order.labReadyForRelease ? <p className="text-sm">Scientific review is complete. Results will appear after release.</p> : null}
      <details><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View sample stages</summary>
        <ul className="mt-2 divide-y">{[...progress.samples].sort((a, b) => (names.get(a.sampleId) ?? '').localeCompare(names.get(b.sampleId) ?? '', undefined, { numeric: true })).map(sample => <li key={sample.sampleId} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="wrap-anywhere">{names.get(sample.sampleId) ?? 'Sample'}</span><span>{customerLabStageLabels[sample.stage] ?? humanizeStatus(sample.stage)}</span></li>)}</ul>
      </details>
      {order.labPermittedQcProjectionJson ? <details><summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Approved QC summary</summary><pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{prettyJson(order.labPermittedQcProjectionJson)}</pre></details> : null}
    </CardContent>
  </Card>
}

function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value } }
