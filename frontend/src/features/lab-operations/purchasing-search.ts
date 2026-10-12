export type PurchasingSection = 'suppliers' | 'products' | 'materials'

export function parsePurchasingSection(value: unknown): PurchasingSection | undefined {
  return value === 'suppliers' || value === 'products' || value === 'materials' ? value : undefined
}
