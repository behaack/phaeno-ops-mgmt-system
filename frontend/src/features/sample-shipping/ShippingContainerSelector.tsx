import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { getSourceSampleShipments, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

export function ShippingContainerSelector({ shipment, action }: { shipment: SampleShipmentWorkflow, action?: ReactNode }) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const navigate = useNavigate()
  const [navigationFailed, setNavigationFailed] = useState(false)
  const allowed = Boolean(session?.capabilities.canViewSampleShipping)
  const query = useQuery({
    queryKey: ['sample-shipments', selectedOrganizationId, selectedDepartmentId, 'source', shipment.authorizationSourceId],
    queryFn: () => getSourceSampleShipments(shipment.authorizationSourceId, false),
    enabled: allowed && authProvider !== 'mock',
  })
  if (!allowed) return null
  const related = (query.data ?? []).filter(item => item.authorizationSourceId === shipment.authorizationSourceId && item.status !== 'Cancelled' && (!item.isPackingPool || item.crosswalk.length > 0))
  // Keep the displayed page selected while its source list is loading or refreshing.
  if (!related.some(item => item.id === shipment.id)) related.push(shipment)
  related.sort((left, right) => Number(left.isPackingPool) - Number(right.isPackingPool) || left.shipmentNumber.localeCompare(right.shipmentNumber, undefined, { numeric: true }) || left.id.localeCompare(right.id))
  const switchContainer = (id: string) => {
    if (id === shipment.id || !related.some(item => item.id === id && item.status !== 'Cancelled')) return
    setNavigationFailed(false)
    // A cancelled navigation blocker can leave navigate's promise pending.
    // Keep the controlled selector usable so the user can finish the scan and switch later.
    void navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: id } }).catch(() => setNavigationFailed(true))
  }
  return <section aria-label="Choose shipping container" className="mb-5 min-w-0 space-y-2">
    <Label htmlFor="shipping-container-selector">Shipping container</Label>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
    <select id="shipping-container-selector" value={shipment.id} disabled={query.isPending || Boolean(query.error) || related.length < 2} onChange={event => switchContainer(event.target.value)} className="h-10 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1" aria-describedby={query.error || navigationFailed ? 'shipping-container-selector-error' : undefined}>
      {related.map(item => <option key={item.id} value={item.id} disabled={item.status === 'Cancelled'}>{item.isPackingPool ? `Tubes awaiting containers · ${item.crosswalk.length} ${item.crosswalk.length === 1 ? 'tube' : 'tubes'} · ${item.destinationName}` : `${item.shipmentNumber} · ${item.container?.commonName ?? item.destinationName} · ${item.crosswalk.length} ${item.crosswalk.length === 1 ? 'tube' : 'tubes'}`}{item.status !== 'Preparing' ? ` · ${item.status.replace(/([a-z])([A-Z])/g, '$1 $2')}` : ''}</option>)}
    </select>
    {action}
    </div>
    {query.error ? <p id="shipping-container-selector-error" role="alert" className="text-sm">Containers could not be loaded. <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry containers</Button></p> : navigationFailed ? <p id="shipping-container-selector-error" role="alert" className="text-sm">That container could not be opened. Try selecting it again.</p> : null}
  </section>
}
