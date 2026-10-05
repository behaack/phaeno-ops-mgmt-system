import { labAmount } from './lab-presentation'
import { Link } from '@tanstack/react-router'
import type { SequencingTubeMember } from '#/api/lab-material-transfers'
import type { LabContainer } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'

export function SequencingTubePairs({ members, canPrint, onPrint }: { members: SequencingTubeMember[]; canPrint: boolean; onPrint: (container: LabContainer) => void }) {
  if (!members.length) return null
  return <section className="overflow-hidden rounded-md border" aria-label="Library and sequencing tube pairs">
    <h3 className="bg-muted/50 px-4 py-3 font-semibold">Tube pairs</h3>
    <ol className="divide-y border-t">{members.map(item => <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
        <p className="break-all font-medium"><Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: item.labWorkOrderId, containerId: item.source.id }} search={{ section: 'work' }}>{item.source.barcode}</Link>{' → '}{item.sequencingTube ? <Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: item.labWorkOrderId, containerId: item.sequencingTube.id }} search={{ section: 'work' }}>{item.sequencingTube.barcode}</Link> : <span className="font-normal text-muted-foreground">Sequencing tube pending</span>}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.libraryKey} · {item.source.location} · {item.transfer ? 'Transfer recorded' : item.sequencingTube?.status === 'LabelPending' ? 'Verify destination label before transfer' : item.sequencingTube ? 'Destination assigned · transfer pending' : 'Pair pending'}</p>
      </div>{canPrint && item.transfer && item.sequencingTube?.barcodeSource === 'PhaenoGenerated' && item.sequencingTube.status !== 'Rejected' ? <Button type="button" variant="outline" size="sm" onClick={() => item.sequencingTube && onPrint(item.sequencingTube)}>{item.sequencingTube.labelPrintCount ? 'Reprint label' : 'Print label'}<span className="sr-only"> for {item.source.barcode}</span></Button> : null}</div>
      {item.transfer ? <dl className="grid gap-2 sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Actual volume transferred</dt><dd className="font-medium">{labAmount(item.transfer.quantityText ?? item.transfer.quantity)} {item.transfer.quantityUnit}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Library balance after transfer</dt><dd className="font-medium">{item.transfer.exhaustedOverride ? 'Exhausted by operator override' : item.transfer.sourceQuantityAfter === null ? 'Unknown' : `${labAmount(item.transfer.sourceQuantityAfterText ?? item.transfer.sourceQuantityAfter)} ${item.transfer.quantityUnit}`}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Catalog minimum</dt><dd className="font-medium">{item.minimumSequencingVolumeUlText ? `${labAmount(item.minimumSequencingVolumeUlText)} µL` : 'Not captured'}</dd></div>
        <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">Performed / recorded</dt><dd>{new Date(item.transfer.performedAtUtc).toLocaleString()} / {new Date(item.transfer.recordedAtUtc).toLocaleString()}</dd></div>
      </dl> : null}
    </li>)}</ol>
  </section>
}
