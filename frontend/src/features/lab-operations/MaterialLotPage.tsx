import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { MaterialLotQuantityDialog } from './MaterialLotQuantityDialog'
import { MaterialLotProductDialog } from './MaterialLotProductDialog'
import { PreparationActions, PreparationPanel } from './preparation-ui'

export function MaterialLotPage({ materialLotId }: { materialLotId: string }) {
  const { session, authProvider } = usePhaenoSession()
  const [reconciling, setReconciling] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const allowed = Boolean(session?.capabilities.canManageLabOperations)
  const query = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: allowed && authProvider !== 'mock' })
  const lot = query.data?.materialLots.find(item => item.id === materialLotId)
  return <main className="page-wrap space-y-5 px-4 py-8">
    <Link to="/lab-operations" search={{ section: 'materials' }} className="text-sm text-primary underline underline-offset-4">Back to Purchased Materials</Link>
    {!allowed ? <p>You do not have access to laboratory materials.</p> : authProvider === 'mock' ? <p>Use a connected Phaeno session to view material lots.</p> : <>
      {query.isError ? <Alert variant="destructive"><AlertTitle>Material lot could not be refreshed</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Try again to load the latest lot details.')}<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></AlertDescription></Alert> : null}
      {query.isPending ? <p role="status">Loading material lot…</p> : lot ? <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h1 className="text-2xl font-semibold wrap-anywhere">{lot.name} · {lot.lotNumber}</h1><p className="mt-1 text-sm text-muted-foreground">{lot.kind === 'PreparedReagent' ? 'Prepared reagent' : 'Supplier lot'}</p></div>
          <PreparationActions items={[
            ...((session?.capabilities.canSuperviseLabWork || session?.capabilities.canManageLabAccess) && lot.quantityHoldReason ? [{ label: 'Reconcile quantity', onClick: () => setReconciling(true) }] : []),
            { label: query.isFetching ? 'Refreshing…' : 'Refresh', disabled: query.isFetching, onClick: () => void query.refetch() },
            ...(session?.capabilities.canOperateLabWork && lot.kind === 'SupplierLot' && !lot.supplierProductId ? [{ label: 'Assign product', onClick: () => setAssigning(true) }] : []),
          ]} />
        </div>
        <PreparationPanel title="Lot details">
          <dl className="grid gap-4 sm:grid-cols-2">
            <LotFact label="Material">{lot.name}</LotFact>
            <LotFact label="Material key">{lot.materialKey}</LotFact>
            <LotFact label="Lot number">{lot.lotNumber}</LotFact>
            {lot.kind === 'SupplierLot' ? <LotFact label="Product name">{lot.productName ?? 'Not assigned — assign a product before use in a product-specific step.'}</LotFact> : null}
            <LotFact label={lot.kind === 'PreparedReagent' ? 'Produced by' : 'Supplier'}>{lot.kind === 'PreparedReagent' ? 'Phaeno' : lot.supplier ?? 'Not recorded'}</LotFact>
            <LotFact label={lot.quantityHoldReason ? "Last recorded balance (unavailable)" : "Available quantity"}>{lot.availableQuantity} {lot.quantityUnit}</LotFact>
            <LotFact label="Storage location">{lot.storageLocation}</LotFact>
            <LotFact label="Expiration or retest date">{dateOnly(lot.expirationOrRetestDate)}</LotFact>
          </dl>
        </PreparationPanel>
        {lot.quantityHoldReason ? <Alert><AlertTitle>Quantity reconciliation required</AlertTitle><AlertDescription>{lot.quantityHoldReason} This lot cannot be used until a Supervisor verifies its remaining quantity.</AlertDescription></Alert> : null}
        {lot.quantityHistoryJson && lot.quantityHistoryJson !== '[]' ? <PreparationPanel title="Quantity history"><ul className="space-y-3">{(JSON.parse(lot.quantityHistoryJson) as { action: string; before: number; after: number; reason: string; utcNow: string; consumedQuantity?: number | null; balanceAdjustmentQuantity?: number | null }[]).map((entry, i) => <li key={i} className="space-y-1 text-sm"><p>{({ hold: 'Quantity placed on hold', reconciled: 'Quantity reconciled', consumed: 'Material used', exhausted: 'Material exhausted (operator override)' } as Record<string, string>)[entry.action] ?? entry.action} · {new Date(entry.utcNow).toLocaleString()}</p><p>{entry.before} → {entry.after} {lot.quantityUnit} · {entry.reason}</p>{entry.consumedQuantity != null ? <p>Actual amount used: {entry.consumedQuantity} {lot.quantityUnit}</p> : null}{entry.balanceAdjustmentQuantity != null ? <p>Remaining-balance adjustment: {entry.balanceAdjustmentQuantity} {lot.quantityUnit}</p> : null}</li>)}</ul></PreparationPanel> : null}
        <PreparationPanel title="Quality control">
          <dl className="grid gap-4 sm:grid-cols-2">
            <LotFact label="QC status"><Badge variant="outline">{lot.qcDisposition === 'ApprovedException' ? 'Approved exception' : lot.qcDisposition}</Badge></LotFact>
            <LotFact label="QC performed on">{dateOnly(lot.qcPerformedOn)}</LotFact>
            {lot.qcFailureReason ? <LotFact label="QC failure reason">{lot.qcFailureReason}</LotFact> : null}
          </dl>
        </PreparationPanel>
        {lot.kind === 'PreparedReagent' || lot.components.length > 0 ? <PreparationPanel title="Source component lots" description="The source lots and quantities recorded when this reagent was prepared.">
          {lot.components.length ? <ul className="divide-y">{lot.components.map(component => <li key={component.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0"><Link to="/lab-operations/materials/$materialLotId" params={{ materialLotId: component.componentMaterialLotId }} search={{ section: 'materials' }} className="font-medium text-primary underline underline-offset-4 wrap-anywhere">{component.materialName} · {component.lotNumber}</Link><p className="mt-1 text-sm text-muted-foreground">{component.materialKey}</p></div>
            <p className="text-sm">{component.quantity} {component.quantityUnit}</p>
          </li>)}</ul> : <p className="text-sm text-muted-foreground">No source component lots were recorded.</p>}
        </PreparationPanel> : null}
        {reconciling ? <MaterialLotQuantityDialog lot={lot} onClose={() => setReconciling(false)} /> : null}
        {assigning ? <MaterialLotProductDialog lot={lot} onClose={() => setAssigning(false)} /> : null}
      </> : !query.isError ? <p role="status">Material lot not found.</p> : null}
    </>}
  </main>
}

function LotFact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap text-sm wrap-anywhere">{children}</dd></div>
}

function dateOnly(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Not recorded'
}
