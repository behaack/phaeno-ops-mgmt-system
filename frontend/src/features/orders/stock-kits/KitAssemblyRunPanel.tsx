import { ChevronDown } from 'lucide-react'
import { getLabOperationsError } from '#/api/lab-operations'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import type { KitAssemblyState } from './use-kit-assembly-run'
import { RecordKitPackedContentsDialog } from './RecordKitPackedContentsDialog'

export function KitAssemblyRunPanel({ assembly }: { assembly: KitAssemblyState }) {
  const { query, run, used, completedComponents } = assembly
  if (query.isPending) return <p role="status">Loading kit assembly…</p>
  if (query.error || !run) return <Alert variant="destructive"><AlertTitle>Assembly record unavailable</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh this kit before continuing.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert>
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Kit assembly</CardTitle>
      <CardDescription>{run.status === 'Completed' ? 'Assembly completed. Recorded steps and component use are retained below.' : run.status === 'Abandoned' ? 'Assembly stopped. Recorded work and component use are retained.' : 'Resume assembly to record packing, label verification and completion together.'}</CardDescription>
      <dl className="col-span-full grid grid-cols-2 gap-3 pt-2 text-sm">
        <div><dt className="text-muted-foreground">Assembly step recorded</dt><dd className="mt-1 font-medium">{run.stepRecords.length} of {run.steps.length}</dd></div>
        <div><dt className="text-muted-foreground">Components recorded</dt><dd className="mt-1 font-medium">{completedComponents} of {run.components.length}</dd></div>
      </dl>
    </CardHeader>
    <CardContent className="space-y-5 p-4">
      <section aria-labelledby="kit-steps-heading">
        <h3 id="kit-steps-heading" className="font-medium">Assembly instructions</h3>
        <ol className="mt-2 divide-y">{run.steps.map((step, index) => <li key={step.labStepVersionId} className="py-2 first:pt-0 last:pb-0">
          <details className="group" open={index === run.stepRecords.length}>
            <summary className="flex cursor-pointer items-center gap-2 rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-ring">
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 -rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none" />
              <span className="min-w-0 flex-1 font-medium">{step.name}</span>
              <Badge variant={run.stepRecords[index] ? 'secondary' : 'outline'}>{run.stepRecords[index] ? 'Recorded' : 'Pending'}</Badge>
            </summary>
            <p className="mt-2 whitespace-pre-wrap pl-6 text-sm">{step.instructions}</p>
            {run.stepRecords[index]?.notes ? <p className="mt-2 whitespace-pre-wrap pl-6 text-sm text-muted-foreground">Recorded notes: {run.stepRecords[index].notes}</p> : null}
          </details>
        </li>)}</ol>
      </section>
      <section aria-labelledby="kit-components-heading" className="border-t pt-4">
        <h3 id="kit-components-heading" className="font-medium">Required contents</h3>
        <ul className="mt-2 divide-y">{run.components.map(item => <li key={item.supplierProductId} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
          <div className="min-w-0 flex-1"><p className="font-medium wrap-anywhere">{item.productNumber}</p><p className="text-xs text-muted-foreground wrap-anywhere">{item.supplierName} · {item.productDescription}</p><p className="mt-1 text-muted-foreground">{used(item.supplierProductId)} of {item.quantity} recorded</p></div>
        </li>)}</ul>
        <p className="mt-2 text-xs text-muted-foreground">Use Actions → Resume assembly to pack contents, print and scan the container label, then complete the kit in one modal.</p>
      </section>
      {run.status === 'InProgress' ? <p className="text-sm text-muted-foreground">{assembly.ready ? 'Everything is recorded. Resume assembly to confirm the attached container label and complete this kit.' : 'Completion in the assembly modal requires exact contents, the unique tube count and the attached container label scan.'}</p> : null}
      {run.abandonmentReason ? <p className="text-sm">Stopped: {run.abandonmentReason}. The kit remains unavailable for dispatch; reconcile unused components with a supervisor.</p> : null}
    </CardContent>
  </Card>
}

export function KitAssemblyDialogs({ kit, assembly, writesBlocked }: { kit: ShippingStockKit; assembly: KitAssemblyState; writesBlocked: boolean }) {
  return assembly.componentsOpen && assembly.run ? <RecordKitPackedContentsDialog kit={kit} assembly={assembly} writesBlocked={writesBlocked} /> : null
}