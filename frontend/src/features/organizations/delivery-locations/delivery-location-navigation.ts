export type DeliveryLocationSearch = { organizationId?: string; departmentId?: string; shipmentId?: string; returnOrderId?: string; companyId?: string; resumeKitOrder?: boolean; locationSearch?: string; locationPage?: number }
export function parseDeliveryLocationSearch(value: Record<string, unknown>): DeliveryLocationSearch {
  const id = (key: string) => typeof value[key] === 'string' && /^[0-9a-f-]{36}$/i.test(value[key]) ? value[key] as string : undefined
  const page = Number(value.locationPage)
  return { resumeKitOrder: value.resumeKitOrder === true || value.resumeKitOrder === 'true' ? true : undefined, organizationId: id('organizationId'), departmentId: id('departmentId'), shipmentId: id('shipmentId'), returnOrderId: id('returnOrderId'), companyId: id('companyId'), locationSearch: typeof value.locationSearch === 'string' ? value.locationSearch.slice(0, 255) : undefined, locationPage: Number.isSafeInteger(page) && page > 0 ? page : 1 }
}
