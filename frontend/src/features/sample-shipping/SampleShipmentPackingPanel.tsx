import { LoadingState } from '#/components/ui/content-state'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { apiErrorMessage } from '#/api/organization-management'
import { confirmSampleShipmentPacking, getSampleShipmentPacking, previewSampleShipmentPacking, type SampleContainerQuantity, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { PackingDialog, PackingSummary, type PackingInput } from './SampleShipmentPackingDialog'

export { PackingDialog, PackingSummary } from './SampleShipmentPackingDialog'

export function SampleShipmentPackingPanel({ shipment, canManage, availableKits: suppliedQuantities, locationInventory = false, locationControl, hasLocationChoice = false, deliveryLocationId, sampleTypeName, writesBlocked = false, onOpenChange, onSelectShipment }: { shipment: SampleShipmentWorkflow; canManage: boolean; availableKits?: SampleContainerQuantity[]; locationInventory?: boolean; locationControl?: ReactNode; hasLocationChoice?: boolean; deliveryLocationId?: string; sampleTypeName?: string; writesBlocked?: boolean; onOpenChange?: (open: boolean) => void; onSelectShipment?: (id: string) => Promise<void> }) {
  const __customerText = useCustomerText()

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
  // Keep the selection step out of the waiting-for-delivery flow. Preserve errors and an open draft.
  if (locationInventory && !hasKits && !query.error && !open) return hasLocationChoice ? <div>{locationControl}</div> : null
  return <Card>
    <CardHeader><CardTitle><CustomerText message="m_1ce09aa2747e" /></CardTitle>{canManage && !query.isPending && !query.error && query.data?.canPack && hasKits && query.data.containerTypes.length > 0 ? <CardAction><Button variant="outline" disabled={writesBlocked || query.isFetching || recommendation.isFetching || Boolean(recommendation.error) || !recommendation.data?.containerCount} onClick={() => { confirm.reset(); changeOpen(true) }}><Settings2 data-icon="inline-start" /><CustomerText message="m_79353d5adbdf" /></Button></CardAction> : null}<CardDescription>{locationInventory ? <CustomerSourceText source={"Scan the barcodes of received containers at the selected container location. Confirming reserves those exact containers for this Job."} /> : availableKits ? "Configure the received kits, then assign tubes to each container." : __customerText('m_9dad62c1cfba')}</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {locationControl}
      {sampleTypeName ? <p className="text-sm"><strong><CustomerText message="m_8dfc56436b67" /></strong> {sampleTypeName}</p> : null}
      {query.isPending ? <LoadingState  label={<><CustomerText message="m_186b6404cb96" /></>} /> : query.error || !query.data ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_c022019ff610" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(query.error)} /> <Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_2054a8f61d7b" /></Button></AlertDescription></Alert>
        : !query.data.canPack ? <p className="text-sm text-muted-foreground">{query.data.blockedReason ?? 'This shipment cannot be repacked. Contact Phaeno for help with its current assignments.'}</p>
          : !hasKits ? <p className="text-sm text-muted-foreground"><CustomerText message="m_54e38b3fd66b" /></p>
          : !query.data.containerTypes.length ? <p className="text-sm text-muted-foreground"><CustomerText message="m_9ece979eb225" /></p>
            : <>
              {recommendation.isPending ? <p role="status" className="text-sm"><CustomerText message="m_c16a9d4ddec8" /></p> : recommendation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_92c2635cb7b0" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(recommendation.error)} /> <Button variant="outline" onClick={() => void recommendation.refetch()}><CustomerText message="m_5342e8cf6f57" /></Button></AlertDescription></Alert> : recommendation.data ? <PackingSummary preview={recommendation.data} description={locationInventory ? "Based on received containers available at this location." : undefined} /> : null}
              {!canManage ? <p className="text-sm text-muted-foreground"><CustomerText message="m_99322bcbb298" /></p> : null}
            </>}
    </CardContent>
    {open && query.data ? <PackingDialog packing={query.data} initial={recommendation.data} availableKits={availableKits} locationInventory={locationInventory} writesBlocked={writesBlocked || query.isFetching || Boolean(query.error) || !canManage} busy={confirm.isPending} error={confirm.error} onClose={() => changeOpen(false)} onConfirm={input => confirm.mutate(input)} /> : null}
  </Card>
}
