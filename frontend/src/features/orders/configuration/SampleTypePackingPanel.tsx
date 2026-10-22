import { LoadingState } from '#/components/ui/content-state'
import { RecordLink } from '#/components/ui/record-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
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
  const __customerText = useCustomerText()

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
    <CardHeader >
      <CardTitle><CustomerText message="m_becb12c02837" /></CardTitle>
      <CardDescription><CustomerText message="m_397010f40e40" /></CardDescription>
    </CardHeader>
    <CardContent className="space-y-5 p-4">
      <div className="text-sm">
        <h3 className="font-medium"><CustomerText message="m_86763155b0e0" /></h3>
        {procedure ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "procedures", procedureId: procedure.id }}>{procedure.name}</Link>
          : <p role="alert" className="text-warning"><CustomerText message="m_5bdbc7cec305" /></p>}
      </div>
      {containers.isLoading ? <LoadingState  label={<><CustomerText message="m_64d3514b35c8" /></>} /> : null}
      {containers.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_9594df9465cc" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(containers.error, 'Refresh the transportation kits and try again.')} />} <Button variant="outline" onClick={() => void containers.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      <div className="space-y-3">
        <h3 className="font-medium"><CustomerText message="m_459a1311b7e2" /></h3>
        {!linked.length && containers.data ? <p role="alert" className="text-sm text-warning"><CustomerText message="m_ad5246311e24" /></p> : null}
        {linked.length > 0 && current.length === 0 ? <p role="alert" className="text-sm text-warning"><CustomerText message="m_af476bb08848" /></p> : null}
        {linked.map(container => <article key={container.id} className="rounded-lg border p-4 text-sm">
          <RecordLink asChild><Link to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: container.id }} search={{}}>{container.commonName}</Link></RecordLink>
          <p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_e330d85ff901" />{container.revision} <CustomerText message="m_db0b5773c2f5" />{container.tubeCapacity} <CustomerText message="m_2fb19d7bbf61" />{current.some(item => item.definitionKey === container.definitionKey) ? <CustomerSourceText source={"Active revision available"} /> : __customerText('m_4bfc8b9205c0')}</p>
          {container.temperatureControlInstructions ? <p className="mt-2 whitespace-pre-wrap"><strong><CustomerText message="m_bd31a088db20" /></strong> {container.temperatureControlInstructions}</p> : null}
          {container.dryIceQuantity != null ? <p className="mt-2"><strong><CustomerText message="m_8efa701191e4" /></strong> {container.dryIceQuantity} {container.dryIceUnit}</p> : null}
          {containerDependencyWarnings(container, configuration).map(warning => <p key={warning.message} role="alert" className="mt-2 text-warning">{<CustomerSourceText source={warning.message} />}</p>)}
        </article>)}
      </div>
    </CardContent>
  </Card>
}
