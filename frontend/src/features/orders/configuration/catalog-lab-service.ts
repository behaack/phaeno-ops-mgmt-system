import type { OrderConfiguration } from '#/api/order-management'

export type CatalogItem = OrderConfiguration['catalogItems'][number]
export const laboratoryOrderingLabel = 'Active laboratory offering'

export function laboratoryOrderingReady(item: CatalogItem | undefined) {
  return Boolean(item?.isPSeqLabService && item.isActive && item.salesUnit.toLowerCase() === 'specimen')
}

export function getLaboratoryOrderingItem(items: CatalogItem[]) {
  return items.find(laboratoryOrderingReady)
}

export function laboratoryOrderingIssue(item: CatalogItem | undefined) {
  return item
    ? `“${item.name}” meets the catalog requirement. Refresh readiness to check the latest saved setup.`
    : 'At least one active offering in the PSeq Lab Service family is required. Other offerings may remain inactive.'
}

export function laboratoryOrderingInstructions(item: CatalogItem | undefined): string[] {
  if (laboratoryOrderingReady(item)) return ['An active PSeq Lab Service offering is available. Refresh readiness; there is no catalog change to save.']
  return [
    'A Phaeno platform administrator opens the user menu → Order settings → Service catalog.',
    'Open any approved laboratory offering and select Edit item, or select Add item to create one. Set Service family to PSeq Lab Service and use the Per sample-sequencing run sales unit.',
    'Review its name, description, base price and currency. Set Status to Active only when that offering is approved, then select Save item.',
    'One active offering clears this catalog requirement. Other offerings may remain inactive. Company service permission and the selected offering’s scientific and sample requirements are checked separately.',
  ]
}
