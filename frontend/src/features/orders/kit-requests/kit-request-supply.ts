import type { TransportationKitRequestDetail } from '#/api/transportation-kit-requests'

export function kitRequestSupply(detail: TransportationKitRequestDetail) {
  const stock = detail.request.lines.filter(line => line.requestedQuantity > line.dispatchedQuantity).map(line => {
    const remaining = line.requestedQuantity - line.dispatchedQuantity
    const ready = Math.min(remaining, detail.availableTypes.find(type => type.containerDefinitionId === line.containerDefinitionId)?.availableQuantity ?? 0)
    return { ...line, remaining, ready, missing: remaining - ready }
  })
  return { shortage: stock.filter(line => line.missing > 0), readyCount: stock.reduce((total, line) => total + line.ready, 0) }
}
