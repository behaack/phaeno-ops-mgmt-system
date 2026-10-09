import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getLabOperationsError, getLabScientificReviewQueue, labWorkOrderLabel } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function ResultsWorkQueue({ enabled }: { enabled: boolean }) {
  const query = useQuery({ queryKey: ['lab-scientific-review'], queryFn: getLabScientificReviewQueue, enabled })
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Results &amp; scientific review</CardTitle>
      <CardDescription>Completed assembly outputs with verified files and passing QC, awaiting scientific review. Open a Job to review its pending packages.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 p-4">
      {enabled && query.isPending ? <p role="status">Loading results awaiting scientific review…</p> : null}
      {query.error ? <Alert variant="destructive"><AlertTitle>Scientific review queue could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh to recover the current review queue.')}<Button variant="outline" onClick={() => void query.refetch()}>Refresh queue</Button></AlertDescription></Alert> : null}
      {query.data?.map(({ workOrder: item, pendingPackageCount }) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs">
        <div><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.id }} search={previous => ({ ...previous, section: 'results', tab: 'review' })} className="font-medium text-primary hover:underline">{labWorkOrderLabel(item)}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{pendingPackageCount} {pendingPackageCount === 1 ? 'package' : 'packages'} awaiting review · {item.specimenCount} {item.specimenCount === 1 ? 'specimen' : 'specimens'} · {item.openExceptionCount} open {item.openExceptionCount === 1 ? 'exception' : 'exceptions'}</p>
        </div><Badge variant="outline">Awaiting scientific review</Badge>
      </div>)}
      {enabled && query.isSuccess && !query.data.length ? <p className="text-sm text-muted-foreground">No completed assembly outputs are awaiting scientific review. Sequencing inputs and assembly work in progress remain in Data assembly.</p> : null}
    </CardContent>
  </Card>
}
