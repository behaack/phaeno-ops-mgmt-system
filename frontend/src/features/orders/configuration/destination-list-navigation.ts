export type DestinationListSearch = {
  destinationSearch?: string
  destinationShowInactive?: boolean
  destinationPage?: number
}

export function parseDestinationListSearch(search: Record<string, unknown>): DestinationListSearch {
  const page = Number(search.destinationPage)
  return {
    destinationSearch: typeof search.destinationSearch === 'string' ? search.destinationSearch.slice(0, 255) : undefined,
    destinationShowInactive: search.destinationShowInactive === true || search.destinationShowInactive === 'true',
    destinationPage: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}
