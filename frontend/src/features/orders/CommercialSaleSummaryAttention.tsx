import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { listSaleSummaryFailures, retrySaleSummary } from '#/api/commercial-sale-summaries'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function CommercialSaleSummaryAttention({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(1)
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['commercial-sale-summary-attention', page], queryFn: () => listSaleSummaryFailures(page), enabled })
  const retry = useMutation({ mutationFn: retrySaleSummary, onSuccess: async () => {
    setPage(1)
    await client.invalidateQueries({ queryKey: ['commercial-sale-summary-attention'] })
  } })
  if (!enabled) return null
  return <Card className="mt-6">
    <CardHeader><CardTitle>CRM sale summaries</CardTitle><CardDescription>Recover summaries awaiting publication to CRM. The committed order remains valid while publication is retried.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {query.isPending ? <p role="status">Loading sale summaries…</p> : query.isError ? <Alert variant="destructive"><AlertTitle>Sale summaries unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, "The sale summaries could not be loaded.")} <Button variant="outline" disabled={query.isFetching} onClick={() => { void query.refetch() }}>Try again</Button></AlertDescription></Alert> : <>
        {!query.data?.items.length ? <p>No sale summaries need attention.</p> : <ul className="divide-y">{query.data.items.map(summary => <li key={summary.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/order-operations/$workflow/$orderId" params={{ workflow: summary.workflowType === 'LabService' ? 'lab' : 'reagent', orderId: summary.orderId }} className="min-w-0 break-words font-medium underline underline-offset-4">{summary.productSummary}</Link><Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(summary)} aria-label={`Retry CRM summary for ${summary.productSummary}`}>Retry publication</Button>
        </li>)}</ul>}
        {query.data && (page > 1 || query.data.totalCount > 10) ? <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={page * 10 >= query.data.totalCount || query.isFetching} onClick={() => setPage(value => value + 1)}>Next</Button></div> : null}
      </>}
      {retry.isError ? <Alert variant="destructive"><AlertTitle>Publication was not retried</AlertTitle><AlertDescription>{getOrderErrorMessage(retry.error, "The summary could not be queued.")} Refresh this queue if another user changed the summary.</AlertDescription></Alert> : null}
      {retry.isSuccess ? <p role="status">Publication queued. The order remains committed.</p> : null}
    </CardContent>
  </Card>
}
