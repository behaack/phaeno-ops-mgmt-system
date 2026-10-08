import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiErrorMessage } from '#/api/organization-management'
import { confirmLocationKitsReceived, getLocationKitInventory, type LocationStockKit } from '#/api/transportation-kit-requests'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

export function LocationKitInventoryPanel({ locationId, organizationId, departmentId, canManage }: { locationId: string; organizationId: string; departmentId: string; canManage: boolean }) {
  const client = useQueryClient()
  const [receiving, setReceiving] = useState<LocationStockKit[] | null>(null)
  const [keys] = useState(() => new Map<string, string>())
  const query = useQuery({ queryKey: ['location-kit-inventory', organizationId, departmentId, locationId], queryFn: () => getLocationKitInventory(locationId) })
  const receipt = useMutation({
    mutationFn: (kits: { stockKitId: string; version: number }[]) => {
      const signature = JSON.stringify(kits), key = keys.get(signature) ?? crypto.randomUUID()
      keys.set(signature, key)
      return confirmLocationKitsReceived(locationId, { kits }, key)
    },
    onSuccess: async () => {
      setReceiving(null)
      await Promise.all(['location-kit-inventory', 'transportation-kit-supply', 'sample-shipment-packing', 'sample-shipment-recommendation', 'platform-transportation-kit-requests', 'platform-transportation-kit-request', 'shipping-stock-kits', 'shipping-stock-kit'].map(key => client.invalidateQueries({ queryKey: [key] })))
    },
  })
  const arriving = query.data?.kits.filter(kit => kit.status === 'OnTheWay') ?? []
  return <Card><CardHeader><CardTitle>Transportation kits</CardTitle><CardDescription>Received containers belong to this location. Assign them to a Job when preparing samples.</CardDescription></CardHeader><CardContent className="space-y-4">
    {query.isPending ? <p role="status">Loading transportation kits…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Kit inventory unavailable</AlertTitle><AlertDescription>Your current view is retained. {apiErrorMessage(query.error)} <Button variant="outline" onClick={() => void query.refetch()}>Retry inventory</Button></AlertDescription></Alert> : null}
    {query.data ? <>
      <div className="flex flex-wrap gap-2">{(['Available', 'OnTheWay', 'Assigned', 'InUse'] as const).map(status => <Badge key={status} variant="outline">{inventoryStatusLabel(status)}: {query.data.kits.filter(kit => kit.status === status).length}</Badge>)}</div>
      {canManage && query.data.canManageInventory && arriving.length > 0 ? <Button disabled={query.isFetching || Boolean(query.error)} onClick={() => { receipt.reset(); keys.clear(); setReceiving(arriving) }}>Confirm kits received</Button> : null}
      {!query.data.kits.length ? <p className="text-sm text-muted-foreground">No transportation kits are recorded at this location yet.</p> : <ul className="divide-y">{query.data.kits.map(kit => <li key={kit.stockKitId} className="space-y-1 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="min-w-0 wrap-anywhere">{kit.kitNumber}</strong><Badge variant="outline">{inventoryStatusLabel(kit.status)}</Badge></div><p>{kit.container.commonName} · SKU {kit.container.sku} · Capacity {kit.container.capacity}</p>{kit.assignedJobNumber ? <p>Assigned to {kit.assignedJobNumber}</p> : null}{kit.originatingJobNumber ? <p className="text-xs text-muted-foreground">Originally requested for {kit.originatingJobNumber}</p> : null}{kit.status === 'NeedsReview' ? <p className="text-sm text-muted-foreground">Contact Phaeno to verify this container before using it.</p> : null}</li>)}</ul>}
      {query.data.requests.some(request => request.kits.length) ? <details className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Delivery history and tracking</summary><ul className="mt-3 space-y-3 text-sm">{query.data.requests.flatMap(request => request.kits.map(kit => <li key={`${request.id}-${kit.stockKitId}`}><p className="font-medium wrap-anywhere">{kit.kitNumber}</p><p>{kit.outboundCarrier} · Tracking {kit.outboundTrackingNumber}</p><p className="text-xs text-muted-foreground">{kit.receivedAt ? 'Received' : 'On the way'} · Requested for {request.jobNumber}</p></li>))}</ul></details> : null}
    </> : null}
    {receiving ? <LocationKitReceiptDialog kits={receiving} busy={receipt.isPending} blocked={query.isFetching || Boolean(query.error) || !query.data?.canManageInventory} error={receipt.error} onClose={() => setReceiving(null)} onConfirm={kits => receipt.mutate(kits)} /> : null}
  </CardContent></Card>
}

export function inventoryStatusLabel(status: LocationStockKit['status']) { return ({ OnTheWay: 'On the way', Available: 'Available', Assigned: 'Assigned', InUse: 'In use', NeedsReview: 'Needs review' })[status] }
const receiptSchema = z.object({ stockKitIds: z.array(z.string()).min(1, 'Select the kits that have arrived.') })
export function LocationKitReceiptDialog({ kits, busy, blocked, error, onClose, onConfirm }: { kits: LocationStockKit[]; busy: boolean; blocked: boolean; error: unknown; onClose: () => void; onConfirm: (kits: { stockKitId: string; version: number }[]) => void }) {
  const form = useForm<z.infer<typeof receiptSchema>>({ resolver: zodResolver(receiptSchema), defaultValues: { stockKitIds: [] } })
  const isDirty = form.formState.isDirty
  const close = () => { if (!busy && (!isDirty || window.confirm('Discard the unsaved receipt selection?'))) onClose() }
  useBlocker({ shouldBlockFn: () => busy || isDirty && !window.confirm('Discard the unsaved receipt selection?'), enableBeforeUnload: busy || isDirty })
  return <Dialog open onOpenChange={next => { if (!next) close() }}><DialogContent showCloseButton={!busy} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}><DialogHeader><DialogTitle>Confirm kits received</DialogTitle><DialogDescription>Select only the containers that have arrived at this location. They become available for eligible Jobs here.</DialogDescription></DialogHeader>
    <form id="location-kit-receipt" noValidate onSubmit={form.handleSubmit(values => { if (!busy && !blocked) onConfirm(kits.filter(kit => values.stockKitIds.includes(kit.stockKitId)).map(kit => ({ stockKitId: kit.stockKitId, version: kit.version }))) })}><fieldset disabled={busy} className="space-y-3"><legend className="mb-3 text-sm font-medium"><RequiredFieldName>Received kits</RequiredFieldName></legend>{kits.map(kit => <label key={kit.stockKitId} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"><input type="checkbox" value={kit.stockKitId} className="mt-1 size-4" {...form.register('stockKitIds')} /><span className="min-w-0 wrap-anywhere"><strong>{kit.kitNumber}</strong><span className="block">{kit.container.commonName} · {kit.container.sku}</span></span></label>)}{form.formState.errors.stockKitIds ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.stockKitIds.message}</p> : null}</fieldset></form>
    {blocked ? <p role="status" className="text-sm text-muted-foreground">Wait for current inventory before confirming. Your selection is retained.</p> : null}
    {error ? <Alert variant="destructive"><AlertTitle>Receipt could not be saved</AlertTitle><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert> : null}
    <RequiredDialogFooter><Button variant="outline" disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form="location-kit-receipt" disabled={busy || blocked}>{busy ? 'Saving receipt…' : 'Confirm received kits'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
