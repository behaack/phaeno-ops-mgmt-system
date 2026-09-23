import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getContainerMaterialTransfers } from '#/api/lab-material-transfers'
import { getLabOperationsError, type LabContainer } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export function BiologicalMaterialHistory({ workOrderId, tube }: { workOrderId: string; tube: LabContainer }) {
  const query = useQuery({ queryKey: ['container-material-transfers', workOrderId, tube.id], queryFn: () => getContainerMaterialTransfers(workOrderId, tube.id) })
  const amount = (value: number | null | undefined, unit: string | null | undefined) => value == null ? 'Unknown' : `${value} ${unit ?? ''}`.trim()
  const basis = tube.quantityBasis === 'CustomerDeclared' ? 'Customer declaration' : tube.quantityBasis === 'Transferred' ? 'Recorded transfer' : tube.quantityBasis === 'Measured' ? 'Laboratory measurement' : 'Historical amount; basis not recorded'
  return <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Biological material</CardTitle></CardHeader><CardContent className="space-y-4 p-4">
    <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Remaining amount</dt><dd>{amount(tube.quantity, tube.quantityUnit)}{tube.status === 'Consumed' ? ' · Exhausted' : ''}</dd></div><div><dt className="text-sm text-muted-foreground">Amount basis</dt><dd>{basis}</dd></div><div><dt className="text-sm text-muted-foreground">Initial recorded amount</dt><dd>{amount(tube.initialQuantity, tube.initialQuantityUnit)}</dd></div></dl>
    <p className="text-xs text-muted-foreground">Declared and transferred amounts are retained as recorded. Prepared-library yield is a separate laboratory measurement.</p>
    {query.isPending ? <p role="status">Loading transfer history…</p> : query.isError ? <div role="alert"><p>{getLabOperationsError(query.error, 'Transfer history could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : query.data?.length ? <ol className="space-y-3" aria-label="Biological material transfers">{query.data.map(transfer => <li key={transfer.id} className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Transferred {transfer.quantity} {transfer.quantityUnit}</p>
      <p className="text-sm break-all"><Link className="text-primary underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: transfer.sourceContainerId }}>{transfer.sourceBarcode}</Link> → <Link className="text-primary underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: transfer.destinationContainerId }}>{transfer.destinationBarcode}</Link></p>
      <p className="text-sm">Source balance: {amount(transfer.sourceQuantityBefore, transfer.quantityUnit)} → {amount(transfer.sourceQuantityAfter, transfer.quantityUnit)}</p>
      {transfer.exhaustedOverride ? <p className="text-sm">Material exhausted override recorded{transfer.balanceAdjustmentQuantity != null ? `; ${transfer.balanceAdjustmentQuantity} ${transfer.quantityUnit} balance adjustment, separate from the amount transferred` : '; earlier source balance was unknown'}.</p> : null}
      <p className="text-xs text-muted-foreground">Performed {new Date(transfer.performedAtUtc).toLocaleString()} · Recorded {new Date(transfer.recordedAtUtc).toLocaleString()}</p>
    </li>)}</ol> : <p className="text-sm text-muted-foreground">No material transfers recorded. Historical transfers are not inferred.</p>}
  </CardContent></Card>
}
