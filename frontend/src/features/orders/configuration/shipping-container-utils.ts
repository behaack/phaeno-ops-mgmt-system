import type { ShippingContainerDefinition } from '#/api/shipping-containers'

export function latestContainerRevisions(items: ShippingContainerDefinition[]) {
  const latest = new Map<string, ShippingContainerDefinition>()
  for (const item of items) {
    const previous = latest.get(item.definitionKey)
    if (!previous || item.revision > previous.revision) latest.set(item.definitionKey, item)
  }
  return [...latest.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.commonName.localeCompare(b.commonName) || a.sku.localeCompare(b.sku))
}

export function containerEffectiveState(item: Pick<ShippingContainerDefinition, 'isActive' | 'effectiveFrom' | 'effectiveTo' | 'deactivatedAt'>) {
  if (item.deactivatedAt) return 'Deactivated'
  if (item.effectiveTo && new Date(item.effectiveTo).getTime() <= Date.now()) return 'Ended'
  if (!item.isActive) return 'Draft'
  if (new Date(item.effectiveFrom).getTime() > Date.now()) return 'Scheduled'
  return 'Active now'
}

export function containerDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function localContainerDateTime(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
