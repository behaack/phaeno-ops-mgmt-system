import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import type { SampleShippingConfiguration, SampleTypeDefinition } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function SampleTypePackingPanel({ sampleType, configuration }: { sampleType: SampleTypeDefinition; configuration: SampleShippingConfiguration }) {
  const containers = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions })
  const familyIds = new Set(configuration.sampleTypes.filter(item => item.definitionKey === sampleType.definitionKey).map(item => item.id))
  const now = Date.now()
  const assignments = configuration.instructionRules.filter(rule => familyIds.has(rule.sampleTypeDefinitionId)
    && rule.isActive && Date.parse(rule.effectiveFrom) <= now && (!rule.effectiveTo || Date.parse(rule.effectiveTo) > now))
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle>Shipping &amp; packing</CardTitle><Button asChild variant="outline"><Link to="/sample-shipping-settings" search={{ shippingSection: 'instructions', sampleTypeId: sampleType.id }}>Manage assignments</Link></Button></div><CardDescription>Current shipping setup for this sample type. Each container has its own approved temperature control and packing steps. Saved shipments retain their original instructions.</CardDescription></CardHeader>
    <CardContent className="space-y-5 p-4">
      {containers.isLoading ? <p role="status">Loading approved containers…</p> : null}
      {containers.error ? <Alert variant="destructive"><AlertTitle>Containers could not be loaded</AlertTitle><AlertDescription><Button variant="outline" onClick={() => void containers.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {!assignments.length ? <p className="text-sm text-muted-foreground">No active shipping assignment is currently effective for this sample type.</p> : null}
      {assignments.map(rule => {
        const procedure = configuration.procedures?.find(item => item.id === rule.shippingProcedureId)
        const approved = (containers.data ?? []).filter(container => container.isActive && !container.deactivatedAt
          && Date.parse(container.effectiveFrom) <= now && (!container.effectiveTo || Date.parse(container.effectiveTo) > now)
          && container.compatibilities.some(pair => pair.instructionRuleId === rule.id && familyIds.has(pair.sampleTypeDefinitionId)))
        return <section key={rule.id} className="space-y-3 border-t pt-4 first:border-0 first:pt-0">
          <h3 className="font-semibold">{rule.destinationName}</h3>
          <p className="text-sm">{procedure ? <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: procedure.id }}>{procedure.name} · revision {procedure.revision}</Link> : 'Existing standalone shipping instructions'}</p>
          {rule.destinationInstructions ? <p className="whitespace-pre-wrap text-sm">{rule.destinationInstructions}</p> : null}
          {!approved.length && containers.data ? <p className="text-sm text-muted-foreground">No currently approved container matches this assignment.</p> : null}
          {approved.map(container => {
            const pair = container.compatibilities.find(value => value.instructionRuleId === rule.id && familyIds.has(value.sampleTypeDefinitionId))!
            return <article key={container.id} className="space-y-2 rounded-lg border p-4">
              <Link className="font-medium underline" to="/order-configuration/shipping-containers/$containerId" params={{ containerId: container.id }} search={{ configurationSection: 'shipping' }}>{container.commonName}</Link>
              <p className="text-xs text-muted-foreground">Revision {container.revision} · capacity {container.tubeCapacity} tubes</p>
              <dl className="space-y-3 text-sm"><div><dt className="font-medium">Temperature control for this container</dt><dd className="mt-1 whitespace-pre-wrap break-words">{pair.temperatureControlInstructions || 'Not recorded for this combination.'}</dd></div><div><dt className="font-medium">Packing steps for this combination</dt><dd className="mt-1 whitespace-pre-wrap break-words">{pair.packingInstructions || 'Not recorded for this combination.'}</dd></div></dl>
            </article>
          })}
        </section>
      })}
    </CardContent>
  </Card>
}
