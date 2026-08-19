import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PackageCheck } from 'lucide-react'

import { getSampleShipments } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'
import { apiErrorMessage } from '#/api/organization-management'

export function SampleShippingPage() {
  const { authProvider, session } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canViewSampleShipping)
  const query = useQuery({
    queryKey: ['sample-shipments'],
    queryFn: getSampleShipments,
    enabled: canView && authProvider !== 'mock',
  })

  if (!canView) {
    return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Sample shipping unavailable</AlertTitle><AlertDescription>Select an active Prospect or Customer organization with an authorized sample shipment.</AlertDescription></Alert></main>
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight">Samples and shipping</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Match each Phaeno-supplied tube to your sample identifier, retain the crosswalk, and prepare the return shipment.</p>
      </section>

      {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected shipments are paused in mock-session mode</AlertTitle><AlertDescription>Use a signed-in Prospect or Customer session to work with return kits.</AlertDescription></Alert> : null}
      {query.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Shipments could not be loaded</AlertTitle><AlertDescription>{apiErrorMessage(query.error)}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader><CardTitle>Authorized shipments</CardTitle><CardDescription>Open a shipment to scan tubes and review its shipping packet.</CardDescription></CardHeader>
        <CardContent>
          {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading sample shipments…</p> : null}
          {(query.data?.length ?? 0) > 0 ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3 font-medium">Shipment</th><th className="px-2 py-3 font-medium">Authorization</th><th className="px-2 py-3 font-medium">Tubes matched</th><th className="px-2 py-3 font-medium">Status</th></tr></thead><tbody>{query.data?.map((shipment) => <tr key={shipment.id} className="border-b last:border-0"><td className="px-2 py-3"><Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }} className="font-medium text-primary underline-offset-4 hover:underline">{shipment.shipmentNumber}</Link><p className="mt-1 text-xs text-muted-foreground">{shipment.destinationName}</p></td><td className="px-2 py-3">{shipment.authorizationReference}<p className="mt-1 text-xs text-muted-foreground">{sourceLabel(shipment.authorizationSource)}</p></td><td className="px-2 py-3">{shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length} of {shipment.crosswalk.length}</td><td className="px-2 py-3"><Badge variant="outline">{humanize(shipment.status)}</Badge></td></tr>)}</tbody></table></div> : !query.isLoading ? <div className="flex flex-col items-center py-12 text-center"><PackageCheck aria-hidden="true" className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">No authorized sample shipments</p><p className="mt-1 max-w-lg text-sm text-muted-foreground">A shipment appears here after Phaeno authorizes the work and prepares its registered return kit.</p></div> : null}
        </CardContent>
      </Card>
    </main>
  )
}

function sourceLabel(value: string) { return value === 'ProspectTrialProject' ? 'Trial Project' : 'Customer promotional order' }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2') }
