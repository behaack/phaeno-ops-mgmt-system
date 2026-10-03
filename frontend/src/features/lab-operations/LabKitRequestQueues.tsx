import { useNavigate, useSearch } from '@tanstack/react-router'
import { PillToggle } from '#/components/ui/pill-toggle'
import { KitRequestsPanel } from '#/features/orders/kit-requests/KitRequestsPanel'
import { parseKitRequestSearch } from '#/features/orders/kit-requests/kit-request-navigation'
import { ReturnKitFulfillmentPanel } from '#/features/orders/ReturnKitFulfillmentPanel'

export function LabKitRequestQueues({ apiEnabled, shipmentId }: { apiEnabled: boolean; shipmentId?: string }) {
  const navigate = useNavigate(), search = useSearch({ strict: false })
  const selected = parseKitRequestSearch(search).kitQueue ?? (shipmentId ? 'sent' : 'requests')
  return <div className="min-w-0 max-w-full space-y-4">
    <PillToggle label="Kit queues" value={selected} options={[{ value: 'requests', label: 'Kit requests' }, { value: 'sent', label: 'Fulfilled requests' }]}
      onValueChange={value => { void navigate({ to: '/lab-operations', search: { ...search, section: 'receipt', receiptTab: 'kit-requests', kitQueue: value as 'requests' | 'sent' }, replace: true, resetScroll: false }) }} />
    <div role="region" className="min-w-0" aria-label={selected === 'requests' ? 'Kit requests queue' : 'Fulfilled requests queue'}>
      {selected === 'requests' ? <KitRequestsPanel apiEnabled={apiEnabled} /> : <ReturnKitFulfillmentPanel apiEnabled={apiEnabled} shipmentId={shipmentId} showEmpty />}
    </div>
  </div>
}
