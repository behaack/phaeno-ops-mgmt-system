export type CatalogListSearch = {
  catalogSearch?: string
  catalogShowInactive?: boolean
}

export function parseCatalogListSearch(search: Record<string, unknown>): CatalogListSearch {
  return {
    catalogSearch: typeof search.catalogSearch === 'string' ? search.catalogSearch.slice(0, 255).trim() || undefined : undefined,
    catalogShowInactive: search.catalogShowInactive === true || search.catalogShowInactive === 'true' || undefined,
  }
}
