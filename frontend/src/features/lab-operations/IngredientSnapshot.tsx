import { DetailField, DetailSummary } from '#/components/ui/detail-summary'
import { formatDisplayTimestamp, formatDisplayDate } from '#/lib/display-format'

type Snapshot = { schemaVersion: number; lotNumber: string; capturedAtUtc: string; qcDisposition: string; expirationOrRetestDate: string | null;
  definition: { name: string }; supplier: { name: string } | null; product: { productNumber: string; description: string } | null;
  storage: { name: string }; qcResultsJson: string | null }
export function IngredientSnapshot({ snapshot }: { snapshot: string | null }) {
  if (!snapshot) return <p className="mt-2 text-xs text-muted-foreground">Historical lot conditions unknown: no snapshot was recorded at withdrawal.</p>
  let value: Snapshot
  try { value = JSON.parse(snapshot) as Snapshot; if (value.schemaVersion !== 2 || !value.definition || !value.storage) throw new Error('Incomplete snapshot') }
  catch { return <p role="alert" className="mt-2 text-xs">The saved ingredient conditions could not be read. Review the original evidence before making a scientific decision.</p> }
  return <details className="mt-2"><summary className="cursor-pointer text-sm font-medium">Lot conditions at withdrawal</summary><div className="mt-3 space-y-2">
    <DetailSummary><DetailField label="Captured" value={formatDisplayTimestamp(value.capturedAtUtc, { seconds: true })} />
      <DetailField label="Material and lot" value={`${value.definition.name} · ${value.lotNumber}`} /><DetailField label="QC disposition" value={value.qcDisposition} />
      <DetailField label="Expiry / retest" value={value.expirationOrRetestDate ? formatDisplayDate(value.expirationOrRetestDate) : 'Not recorded'} />
      <DetailField label="Supplier" value={value.supplier?.name ?? 'Not recorded'} /><DetailField label="Supplier product" value={value.product ? `${value.product.productNumber} · ${value.product.description}` : 'Not recorded'} />
      <DetailField label="Storage at withdrawal" value={value.storage.name} /></DetailSummary>
    {value.qcResultsJson ? <p className="whitespace-pre-wrap break-words text-xs">Recorded QC: {value.qcResultsJson}</p> : null}
    <p className="text-xs text-muted-foreground">Frozen recorded conditions. Later lot or catalog changes do not rewrite this evidence.</p>
  </div></details>
}
