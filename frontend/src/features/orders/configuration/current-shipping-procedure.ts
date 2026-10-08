import type { SampleShippingProcedure } from '#/api/sample-shipping'

export function currentShippingProcedure(procedures: SampleShippingProcedure[] | undefined, selectedId: string | null | undefined) {
  const selected = procedures?.find(item => item.id === selectedId)
  if (!selected) return undefined
  return procedures?.filter(item => item.definitionKey === selected.definitionKey && item.isActive)
    .sort((a, b) => b.revision - a.revision)[0]
}
