export type SampleTypeListSearch = {
  sampleTypeSearch?: string
  sampleTypeShowInactive?: boolean
  sampleTypePage?: number
}

export function parseSampleTypeListSearch(search: Record<string, unknown>): SampleTypeListSearch {
  const page = Number(search.sampleTypePage)
  return {
    sampleTypeSearch: typeof search.sampleTypeSearch === 'string' ? search.sampleTypeSearch.slice(0, 255) : undefined,
    sampleTypeShowInactive: search.sampleTypeShowInactive === true || search.sampleTypeShowInactive === 'true',
    sampleTypePage: Number.isSafeInteger(page) && page > 0 ? page : 1,
  }
}
