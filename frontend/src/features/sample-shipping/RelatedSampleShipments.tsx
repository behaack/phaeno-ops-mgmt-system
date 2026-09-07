import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getPlatformSampleShipments, getSampleShipments } from '#/api/sample-shipping'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'

export function RelatedSampleShipments({ sourceId, staff = false }: { sourceId: string; staff?: boolean }) {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const allowed = Boolean(staff ? session?.capabilities.canManageLabOperations : session?.capabilities.canViewSampleShipping)
  const shipments = useQuery({
    queryKey: [staff ? 'platform-sample-shipments' : 'sample-shipments', selectedOrganizationId, selectedDepartmentId],
    queryFn: staff ? getPlatformSampleShipments : getSampleShipments,
    enabled: allowed && authProvider !== 'mock',
  })
  const related = shipments.data?.filter(value => value.authorizationSourceId === sourceId) ?? []
  return <section aria-label="Related shipments" className="space-y-3 border-t pt-4">
    <h3 className="font-semibold">Return kit and shipment</h3>
    {!allowed ? <p className="text-sm text-muted-foreground">Laboratory operators manage the return kit, tubes, and packet in Lab operations.</p>
      : shipments.error ? <div role="alert" className="text-sm">Shipments could not be loaded. <Button variant="outline" onClick={() => { void shipments.refetch() }}>Retry shipments</Button></div>
        : shipments.isLoading ? <p role="status" className="text-sm">Loading related shipments…</p>
          : related.length ? <ul className="divide-y">{related.map(shipment => <li key={shipment.id} className="space-y-1 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{shipment.shipmentNumber}</span><span>{shipment.status.replace(/([a-z])([A-Z])/g, '$1 $2')}</span></div>
            <p>{shipment.destinationName} · {shipment.crosswalk.filter(value => value.supplierTubeBarcode).length} of {shipment.crosswalk.length} tubes matched</p>
            {shipment.trackingNumber ? <p>{shipment.carrier} · Tracking {shipment.trackingNumber}</p> : null}
            {staff ? <Link to="/lab-operations" search={{ section: 'receipt', shipmentId: shipment.id }} className="text-primary underline">Open Lab shipping</Link>
              : <Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }} className="text-primary underline">Open return kit, tubes and packet</Link>}
          </li>)}</ul> : <p className="text-sm text-muted-foreground">A shipment appears after the sample list is authorized. Phaeno then prepares its registered return kit.</p>}
  </section>
}
