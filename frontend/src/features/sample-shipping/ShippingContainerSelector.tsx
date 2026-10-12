import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { getSourceSampleShipments, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

export function ShippingContainerSelector({ shipment, action, onSelectShipment }: { shipment: SampleShipmentWorkflow; action?: ReactNode; onSelectShipment?: (id: string) => Promise<void> }) {
  const __customerText = useCustomerText()

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
    const selection = onSelectShipment ? onSelectShipment(id) : navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: id } })
    void selection.catch(() => setNavigationFailed(true))
  }
  return <section aria-label={__customerText('m_30d7693bed43')} className="mb-5 min-w-0 space-y-2">
    <Label htmlFor="shipping-container-selector"><CustomerText message="m_093db4f01d81" /></Label>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
    <NativeSelect id="shipping-container-selector" value={shipment.id} disabled={query.isPending || Boolean(query.error) || related.length < 2} onChange={event => switchContainer(event.target.value)} className="w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1" aria-describedby={query.error || navigationFailed ? "shipping-container-selector-error" : undefined}>
      {related.map(item => <option key={item.id} value={item.id} disabled={item.status === 'Cancelled'}>{item.isPackingPool ? __customerText('m_e35911bf7b8c', { p0: String(item.crosswalk.length), p1: String(item.crosswalk.length === 1 ? 'tube' : 'tubes'), p2: String(item.destinationName) }) : `${item.shipmentNumber} · ${item.container?.commonName ?? item.destinationName} · ${item.crosswalk.length} ${item.crosswalk.length === 1 ? "tube" : __customerText('m_cc169e248ff2')}`}{item.status !== 'Preparing' ? ` · ${item.status.replace(/([a-z])([A-Z])/g, '$1 $2')}` : ''}</option>)}
    </NativeSelect>
    {action}
    </div>
    {shipment.status === 'Cancelled' && related.some(item => item.status !== 'Cancelled') ? <Button variant="outline" disabled={query.isFetching || Boolean(query.error)} onClick={() => switchContainer((related.find(item => item.status !== 'Cancelled' && item.isPackingPool) ?? related.find(item => item.status !== 'Cancelled'))!.id)}><CustomerText message="m_e5a826b106c6" /></Button> : null}
    {query.error ? <p id="shipping-container-selector-error" role="alert" className="text-sm"><CustomerText message="m_4dc469ea4d62" /><Button size="sm" variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_2054a8f61d7b" /></Button></p> : navigationFailed ? <p id="shipping-container-selector-error" role="alert" className="text-sm"><CustomerText message="m_609eeb70f94c" /></p> : null}
  </section>
}
