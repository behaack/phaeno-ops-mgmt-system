export type ShippingContainerListSearch = {
  containerSearch?: string
  containerStatus?: 'all' | 'active' | 'inactive'
  containerPage?: number
}

export function parseShippingContainerListSearch(search: Record<string, unknown>): ShippingContainerListSearch {
  const page = Number(search.containerPage)
  return {
    containerSearch: typeof search.containerSearch === 'string' ? search.containerSearch.slice(0, 255) : undefined,
    containerStatus: search.containerStatus === 'active' || search.containerStatus === 'inactive' ? search.containerStatus : 'all',
    containerPage: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}
