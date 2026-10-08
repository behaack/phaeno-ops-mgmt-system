import type { SampleShippingConfiguration, SampleTypeDefinition } from '#/api/sample-shipping'
import type { ShippingContainerDefinition } from '#/api/shipping-containers'
import { currentShippingProcedure } from './current-shipping-procedure'

export type DependencyWarning = { message: string; blocksNewWork: boolean }

const availableAt = (item: { isActive: boolean; effectiveFrom: string; effectiveTo: string | null }, at: number) =>
  item.isActive && Date.parse(item.effectiveFrom) <= at && (!item.effectiveTo || Date.parse(item.effectiveTo) > at)

export function containerDependencyWarnings(container: ShippingContainerDefinition, configuration: SampleShippingConfiguration): DependencyWarning[] {
  if (!container.isActive || container.deactivatedAt || container.effectiveTo && Date.parse(container.effectiveTo) <= Date.now()) return []
  const at = Math.max(Date.now(), Date.parse(container.effectiveFrom))
  const warnings: DependencyWarning[] = []
  const anchor = configuration.sampleTypes.find(item => item.id === container.sampleTypeAnchorId)
  if (!anchor) warnings.push({ message: container.sampleTypeAnchorId ? 'The linked Sample type is unavailable.' : 'Link this kit to a Sample type before use.', blocksNewWork: true })
  const current = anchor && configuration.sampleTypes.filter(item => item.definitionKey === anchor.definitionKey && availableAt(item, at)).sort((a, b) => b.revision - a.revision)[0]
  if (anchor && !current) warnings.push({ message: 'Selected sample type is not active.', blocksNewWork: true })
  if (current && !currentShippingProcedure(configuration.procedures, current.shippingProcedureId))
    warnings.push({ message: `${current.name}'s shipping procedure has no Active revision.`, blocksNewWork: true })
  if (!container.shippingContainerProductId) {
    warnings.push({ message: 'This kit needs a purchased Shipping Container before it can be used for new Orders. Edit or create a Draft revision and select its container.', blocksNewWork: true })
    return warnings
  }
  if (!container.temperatureControlInstructions) warnings.push({ message: 'Record the kit temperature-control instructions.', blocksNewWork: true })
  if (Boolean(container.dryIceQuantity) !== Boolean(container.dryIceUnit))
    warnings.push({ message: 'Record both the dry-ice amount and unit.', blocksNewWork: true })
  if (container.newWorkReady === false && availableAt(container, Date.now()) && !warnings.length)
    warnings.push({ message: 'The selected Shipping Container is unavailable or incompatible with this specification. Review its supplier, active status, inventory unit and tube capacity.', blocksNewWork: true })
  return warnings
}

export function affectedSampleTypesAfterProcedureDeactivation(id: string, configuration: SampleShippingConfiguration): SampleTypeDefinition[] {
  const selected = configuration.procedures?.find(item => item.id === id)
  if (!selected) return []
  const after = configuration.procedures?.map(item => item.id === id ? { ...item, isActive: false } : item)
  return [...new Map(configuration.sampleTypes.filter(item => availableAt(item, Date.now()))
    .sort((a, b) => a.revision - b.revision).map(item => [item.definitionKey, item])).values()]
    .filter(item => {
      const relationship = configuration.procedures?.find(procedure => procedure.id === item.shippingProcedureId)
      return relationship?.definitionKey === selected.definitionKey && !currentShippingProcedure(after, item.shippingProcedureId)
    })
}
