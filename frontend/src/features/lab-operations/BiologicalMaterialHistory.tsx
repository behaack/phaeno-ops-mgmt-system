import { LoadingState } from '#/components/ui/content-state'
import { DisplayTimestamp } from '#/components/ui/display-value'
import { RecordLink } from '#/components/ui/record-link'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getContainerMaterialTransfers } from '#/api/lab-material-transfers'
import { getLabOperationsError, type LabContainer } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export function BiologicalMaterialHistory({ workOrderId, tube }: { workOrderId: string; tube: LabContainer }) {
  const query = useQuery({ queryKey: ['container-material-transfers', workOrderId, tube.id], queryFn: () => getContainerMaterialTransfers(workOrderId, tube.id) })
  const amount = (value: number | null | undefined, unit: string | null | undefined, exact?: string | null) => value == null ? 'Unknown' : `${exact ?? value} ${unit ?? ''}`.trim()
  const basis = tube.quantityBasis === 'CustomerDeclared' ? 'Customer declaration' : tube.quantityBasis === 'Transferred' ? 'Recorded transfer' : tube.quantityBasis === 'Measured' ? 'Laboratory measurement' : 'Historical amount; basis not recorded'
  return <Card className="gap-0 py-0"><CardHeader ><CardTitle>Biological material</CardTitle></CardHeader><CardContent className="space-y-4 p-4">
    <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Remaining amount</dt><dd>{amount(tube.quantity, tube.quantityUnit, tube.quantityText)}{tube.status === 'Consumed' ? ' · Exhausted' : ''}</dd></div><div><dt className="text-sm text-muted-foreground">Amount basis</dt><dd>{basis}</dd></div><div><dt className="text-sm text-muted-foreground">Initial recorded amount</dt><dd>{amount(tube.initialQuantity, tube.initialQuantityUnit, tube.initialQuantityText)}</dd></div></dl>
    <p className="text-xs text-muted-foreground">Declared and transferred amounts are retained as recorded. Prepared-library yield is a separate laboratory measurement.</p>
    {tube.quantityMeasurements?.length ? <section aria-label="Prepared-library measurements"><h3 className="text-sm font-medium">Measured yield history</h3><ol className="mt-2 space-y-2">{tube.quantityMeasurements.map(measurement => <li key={measurement.recordId} className="text-sm"><p>{measurement.beforeText ?? 'No previous amount'} → {measurement.afterText} {measurement.unit}</p><p className="text-xs text-muted-foreground">Recorded {<DisplayTimestamp value={measurement.recordedAtUtc} seconds />} · Recorder {measurement.actorId}</p></li>)}</ol></section> : null}
    {query.isPending ? <LoadingState  label={<>Loading transfer history…</>} /> : query.isError ? <div role="alert"><p>{getLabOperationsError(query.error, 'Transfer history could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></div> : query.data?.length ? <ol className="space-y-3" aria-label="Biological material transfers">{query.data.map(transfer => <li key={transfer.id} className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Transferred {transfer.quantityText ?? transfer.quantity} {transfer.quantityUnit}</p>
      <p className="text-sm break-all"><RecordLink asChild><Link to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: transfer.sourceContainerId }}>{transfer.sourceBarcode}</Link></RecordLink> → <RecordLink asChild><Link to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId, containerId: transfer.destinationContainerId }}>{transfer.destinationBarcode}</Link></RecordLink></p>
      <p className="text-sm">Source balance: {amount(transfer.sourceQuantityBefore, transfer.quantityUnit, transfer.sourceQuantityBeforeText)} → {amount(transfer.sourceQuantityAfter, transfer.quantityUnit, transfer.sourceQuantityAfterText)}</p>
      {transfer.exhaustedOverride ? <p className="text-sm">Material exhausted override recorded{transfer.balanceAdjustmentQuantity != null ? `; ${transfer.balanceAdjustmentQuantityText ?? transfer.balanceAdjustmentQuantity} ${transfer.quantityUnit} balance adjustment, separate from the amount transferred` : '; earlier source balance was unknown'}.</p> : null}
      <p className="text-xs text-muted-foreground">Performed {<DisplayTimestamp value={transfer.performedAtUtc} seconds />} · Recorded {<DisplayTimestamp value={transfer.recordedAtUtc} seconds />}</p>
    </li>)}</ol> : <p className="text-sm text-muted-foreground">No material transfers recorded. Historical transfers are not inferred.</p>}
  </CardContent></Card>
}
