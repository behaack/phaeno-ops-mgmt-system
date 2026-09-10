export type ShippingInsertIdentity = { id: string; revision: number; packetNumber: string }

const unavailableStorage = new Map<string, string>()
const storagePrefix = 'phaeno:shipping-insert-packed:'

export function shippingInsertScope(userId: string, organizationId: string, shipmentId: string) {
  return `${storagePrefix}${JSON.stringify([userId, organizationId, shipmentId])}`
}

function identityValue(insert: ShippingInsertIdentity) {
  return JSON.stringify([insert.id, insert.revision])
}

// This tab-local acknowledgement only chooses the next UI action. It is not a
// server workflow fact, proof of physical printing, or evidence of dispatch.
export function isShippingInsertAcknowledged(scope: string | null, insert: ShippingInsertIdentity | null | undefined) {
  if (!scope || !insert) return false
  try {
    return (unavailableStorage.get(scope) ?? window.sessionStorage.getItem(scope)) === identityValue(insert)
  } catch {
    return unavailableStorage.get(scope) === identityValue(insert)
  }
}

export function acknowledgeShippingInsert(scope: string, insert: ShippingInsertIdentity) {
  const value = identityValue(insert)
  try {
    window.sessionStorage.setItem(scope, value)
    unavailableStorage.delete(scope)
  } catch {
    unavailableStorage.set(scope, value)
  }
}
