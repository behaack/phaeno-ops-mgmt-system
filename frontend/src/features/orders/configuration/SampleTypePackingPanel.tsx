import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getOrderErrorMessage } from '#/api/order-management'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import type { SampleShippingConfiguration, SampleTypeDefinition } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { recordLinkClassName } from '#/components/ui/record-link'
import { currentShippingProcedure } from './current-shipping-procedure'
import { containerDependencyWarnings } from './shipping-dependency-health'

export function SampleTypePackingPanel({ sampleType, configuration }: { sampleType: SampleTypeDefinition; configuration: SampleShippingConfiguration }) {
  const containers = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions })
  const now = Date.now()
  const procedure = currentShippingProcedure(configuration.procedures, sampleType.shippingProcedureId)
  const linkedRevisions = (containers.data ?? []).filter(container => container.sampleTypeAnchorId &&
    configuration.sampleTypes.some(revision => revision.id === container.sampleTypeAnchorId && revision.definitionKey === sampleType.definitionKey))
  const linked = Array.from(linkedRevisions.reduce((latest, container) => {
    const prior = latest.get(container.definitionKey)
    if (!prior || container.revision > prior.revision) latest.set(container.definitionKey, container)
    return latest
  }, new Map<string, typeof linkedRevisions[number]>()).values())
  const current = linkedRevisions.filter(container => container.isActive && !container.deactivatedAt &&
    Date.parse(container.effectiveFrom) <= now && (!container.effectiveTo || Date.parse(container.effectiveTo) > now)
    && containerDependencyWarnings(container, configuration).length === 0)

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>Shipping &amp; transportation kits</CardTitle>
      <CardDescription>The selected procedure supplies shared steps. Linked kit specifications supply capacity, temperature control, dry ice, packing, and bill of materials. Issued packets retain their saved instructions.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5 p-4">
      <div className="text-sm">
        <h3 className="font-medium">Shipping procedure</h3>
        {procedure ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: procedure.id }}>{procedure.name}</Link>
          : <p role="alert" className="text-destructive">No Active procedure is available. New Orders of this Sample type are blocked.</p>}
      </div>
      {containers.isLoading ? <p role="status">Loading transportation kits…</p> : null}
      {containers.error ? <Alert variant="destructive"><AlertTitle>Transportation kits could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(containers.error, 'Refresh the transportation kits and try again.')} <Button variant="outline" onClick={() => void containers.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      <div className="space-y-3">
        <h3 className="font-medium">Linked transportation kits</h3>
        {!linked.length && containers.data ? <p role="alert" className="text-sm text-destructive">No kit is linked to this Sample type. It can be saved as a draft, but new Orders are blocked.</p> : null}
        {linked.length > 0 && current.length === 0 ? <p role="alert" className="text-sm text-destructive">No linked kit is currently usable for new Orders. Review its status, bill of materials, workflow, and temperature instructions.</p> : null}
        {linked.map(container => <article key={container.id} className="rounded-lg border p-4 text-sm">
          <Link className={recordLinkClassName} to="/order-configuration/shipping-containers/$containerId" params={{ containerId: container.id }} search={{ configurationSection: 'shipping' }}>{container.commonName}</Link>
          <p className="mt-1 text-xs text-muted-foreground">Revision {container.revision} · capacity {container.tubeCapacity} tubes · {current.some(item => item.definitionKey === container.definitionKey) ? 'Active revision available' : 'Unavailable for new requests'}</p>
          {container.temperatureControlInstructions ? <p className="mt-2 whitespace-pre-wrap"><strong>Temperature control:</strong> {container.temperatureControlInstructions}</p> : null}
          {container.dryIceQuantity != null ? <p className="mt-2"><strong>Dry ice:</strong> {container.dryIceQuantity} {container.dryIceUnit}</p> : null}
          {container.packingInstructions ? <p className="mt-2 whitespace-pre-wrap"><strong>Packing:</strong> {container.packingInstructions}</p> : null}
          {containerDependencyWarnings(container, configuration).map(warning => <p key={warning.message} role="alert" className="mt-2 text-destructive">{warning.message}</p>)}
        </article>)}
      </div>
    </CardContent>
  </Card>
}
