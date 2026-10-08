export type SupplierCatalogTab = 'suppliers' | 'product-types'
export function parseSupplierCatalogTab(value: unknown): SupplierCatalogTab | undefined {
  return value === 'suppliers' || value === 'product-types' ? value : undefined
}
