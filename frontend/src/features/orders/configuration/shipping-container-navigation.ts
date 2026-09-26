export type ShippingContainerListSearch = {
  containerSearch?: string
  containerShowInactive?: boolean
  containerStatus?: 'all' | 'active' | 'inactive'
  containerPage?: number
}

export function parseShippingContainerListSearch(search: Record<string, unknown>): ShippingContainerListSearch {
  const page = Number(search.containerPage)
  return {
    containerSearch: typeof search.containerSearch === 'string' ? search.containerSearch.slice(0, 255) : undefined,
    containerShowInactive: search.containerShowInactive === true || search.containerShowInactive === 'true',
    containerStatus: search.containerStatus === 'active' || search.containerStatus === 'inactive' ? search.containerStatus : 'all',
    containerPage: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}
