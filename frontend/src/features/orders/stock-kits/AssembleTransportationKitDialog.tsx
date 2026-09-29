import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getShippingStockKit, type ShippingContainerDefinition, type ShippingStockKit } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { PrepareStandardKitDialog } from './StandardKitDialogs'
import { RecordKitPackedContentsDialog } from './RecordKitPackedContentsDialog'
import { useKitAssemblyRun } from './use-kit-assembly-run'

export function AssembleTransportationKitDialog({ definitions = [], initialKit, onClose, onSaved }: {
  definitions?: ShippingContainerDefinition[]; initialKit?: ShippingStockKit; onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void>
}) {
  const client = useQueryClient()
  const [kit, setKit] = useState(initialKit)
  const [printOnOpen, setPrintOnOpen] = useState(false)
  if (!kit) return <PrepareStandardKitDialog definitions={definitions} onClose={onClose} onSaved={onSaved} onPrintPrepared={async prepared => {
    setPrintOnOpen(true)
    setKit(prepared)
    await client.invalidateQueries({ queryKey: ['shipping-stock-kits'] })
  }} />
  return <SavedKitAssemblyDialog key={kit.id} kit={kit} printOnOpen={printOnOpen} onClose={onClose} onSaved={onSaved} />
}

function SavedKitAssemblyDialog({ kit: initialKit, printOnOpen, onClose, onSaved }: {
  kit: ShippingStockKit; printOnOpen: boolean; onClose: () => void; onSaved: (kit: ShippingStockKit) => void | Promise<void>
}) {
  const query = useQuery({ queryKey: ['shipping-stock-kit', initialKit.id], queryFn: () => getShippingStockKit(initialKit.id), initialData: initialKit })
  const kit = query.data
  const assembly = useKitAssemblyRun(kit.id, kit, true, async () => { await query.refetch() }, async () => {
    const refreshed = await query.refetch()
    if (refreshed.data) await onSaved(refreshed.data)
  })
  if (!assembly.run) return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent><DialogHeader><DialogTitle>Assemble transportation kit</DialogTitle></DialogHeader>
    {query.error || assembly.query.error ? <Alert variant="destructive"><AlertTitle>Assembly unavailable</AlertTitle><AlertDescription>Refresh the kit and its assembly record before continuing.</AlertDescription></Alert> : <p role="status">Loading assembly…</p>}
    <DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="outline" onClick={() => { void query.refetch(); void assembly.query.refetch() }}>Retry</Button></DialogFooter>
  </DialogContent></Dialog>
  return <RecordKitPackedContentsDialog kit={kit} assembly={{ ...assembly, setComponentsOpen: open => { if (!open) onClose() } }} writesBlocked={Boolean(query.error) || query.isFetching} printOnOpen={printOnOpen} refreshError={Boolean(query.error) || Boolean(assembly.query.error)} onRetryRefresh={() => { void query.refetch(); void assembly.query.refetch() }} />
}
