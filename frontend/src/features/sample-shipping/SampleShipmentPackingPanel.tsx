import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { apiErrorMessage } from '#/api/organization-management'
import { confirmSampleShipmentPacking, getSampleShipmentPacking, previewSampleShipmentPacking, type SampleContainerQuantity, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { PackingDialog, PackingSummary, type PackingInput } from './SampleShipmentPackingDialog'

export { PackingDialog, PackingSummary } from './SampleShipmentPackingDialog'

export function SampleShipmentPackingPanel({ shipment, canManage, availableKits: suppliedQuantities, locationInventory = false, deliveryLocationId, writesBlocked = false, onOpenChange, onSelectShipment }: { shipment: SampleShipmentWorkflow; canManage: boolean; availableKits?: SampleContainerQuantity[]; locationInventory?: boolean; deliveryLocationId?: string; writesBlocked?: boolean; onOpenChange?: (open: boolean) => void; onSelectShipment?: (id: string) => Promise<void> }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const query = useQuery({ queryKey: ['sample-shipment-packing', shipment.id, ...(locationInventory ? [deliveryLocationId] : [])], queryFn: () => getSampleShipmentPacking(shipment.id, deliveryLocationId) })
  const availableKits = locationInventory ? Object.entries((query.data?.availableKits ?? []).reduce<Record<string, number>>((counts, kit) => { counts[kit.container.definitionId] = (counts[kit.container.definitionId] ?? 0) + 1; return counts }, {})).map(([containerDefinitionId, quantity]) => ({ containerDefinitionId, quantity })) : suppliedQuantities
  const supplySignature = JSON.stringify(availableKits ?? null)
  const hasKits = availableKits === undefined || availableKits.some(item => item.quantity > 0)
  const recommendation = useQuery({ queryKey: ['sample-shipment-recommendation', shipment.id, query.data?.version, supplySignature, deliveryLocationId], queryFn: () => previewSampleShipmentPacking(shipment.id, { ...(deliveryLocationId ? { deliveryLocationId } : {}) }), enabled: !writesBlocked && hasKits && Boolean(query.data?.canPack && query.data.containerTypes.length) })
  const changeOpen = (next: boolean) => { setOpen(next); onOpenChange?.(next) }
  const confirm = useMutation({
    mutationFn: (input: PackingInput & { version: number }) => confirmSampleShipmentPacking(shipment.id, { version: input.version, containers: input.selection, availability: input.availability, containerTubeCounts: input.containerTubeCounts, ...(input.deliveryLocationId ? { deliveryLocationId: input.deliveryLocationId, stockKits: input.stockKits } : {}) }),
    onSuccess: async shipments => {
      changeOpen(false)
      for (const prepared of shipments) client.setQueryData(['sample-shipment', prepared.id], prepared)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['sample-shipment', shipment.id] }),
        client.invalidateQueries({ queryKey: ['sample-shipments'] }),
        client.invalidateQueries({ queryKey: ['sample-shipment-packing', shipment.id] }),
        client.invalidateQueries({ queryKey: ['transportation-kit-supply', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['lab-service-order', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['trial-project', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['location-kit-inventory'] }),
      ])
      const first = shipments.find(item => !item.isPackingPool && item.crosswalk.length)
      if (first) {
        if (onSelectShipment) await onSelectShipment(first.id)
        else await navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: first.id } })
      }
    },
  })
  return <Card>
    <CardHeader><CardTitle>Choose shipping containers</CardTitle><CardDescription>{locationInventory ? 'Scan the barcodes of received containers at your departure location. Confirming reserves those exact containers for this Job.' : availableKits ? 'Configure the received kits, then assign tubes to each container.' : 'Review the recommended containers, then adjust the sizes and tube counts for your shipment.'}</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {query.isPending ? <p role="status">Loading compatible containers…</p> : query.error || !query.data ? <Alert variant="destructive"><AlertTitle>Containers unavailable</AlertTitle><AlertDescription>{apiErrorMessage(query.error)} <Button variant="outline" onClick={() => void query.refetch()}>Retry containers</Button></AlertDescription></Alert>
        : !query.data.canPack ? <p className="text-sm text-muted-foreground">{query.data.blockedReason ?? 'This shipment cannot be repacked. Contact Phaeno for help with its current assignments.'}</p>
          : !hasKits ? <p className="text-sm text-muted-foreground">No compatible received kits remain available at this location. Choose another location or order kits and confirm their arrival.</p>
          : !query.data.containerTypes.length ? <p className="text-sm text-muted-foreground">No compatible container sizes are available. Contact Phaeno before packing these tubes.</p>
            : <>
              {recommendation.isPending ? <p role="status" className="text-sm">Preparing a recommendation…</p> : recommendation.error ? <Alert variant="destructive"><AlertTitle>Recommendation unavailable</AlertTitle><AlertDescription>{apiErrorMessage(recommendation.error)} <Button variant="outline" onClick={() => void recommendation.refetch()}>Retry recommendation</Button></AlertDescription></Alert> : recommendation.data ? <PackingSummary preview={recommendation.data} description={locationInventory ? 'Based on received containers available at this location.' : undefined} /> : null}
              {canManage ? <Button variant="outline" disabled={writesBlocked || query.isFetching || recommendation.isFetching || Boolean(recommendation.error) || !recommendation.data?.containerCount} onClick={() => { confirm.reset(); changeOpen(true) }}><Settings2 data-icon="inline-start" />Adjust containers</Button> : <p className="text-sm text-muted-foreground">An authorized organization or Department administrator prepares the containers.</p>}
            </>}
    </CardContent>
    {open && query.data ? <PackingDialog packing={query.data} initial={recommendation.data} availableKits={availableKits} locationInventory={locationInventory} writesBlocked={writesBlocked || query.isFetching || Boolean(query.error) || !canManage} busy={confirm.isPending} error={confirm.error} onClose={() => changeOpen(false)} onConfirm={input => confirm.mutate(input)} /> : null}
  </Card>
}
