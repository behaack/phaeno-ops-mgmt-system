import type { ShippingKitContent } from '#/api/shipping-containers'

export function ShippingKitContents({ contents }: { contents: ShippingKitContent[] }) {
  return <ul aria-label="Bill of materials" className="divide-y text-sm">
    {contents.map(item => <li key={item.supplierProductId} className="flex items-start gap-3 py-3">
      <span className="shrink-0 font-semibold tabular-nums">{item.quantity} ×</span>
      <div className="min-w-0">
        <p className="wrap-anywhere font-medium">{item.productNumber}</p>
        <p className="wrap-anywhere text-muted-foreground">{item.supplierName} · {item.productTypeName}</p>
        <p className="mt-1 wrap-anywhere text-xs text-muted-foreground">{item.productDescription}</p>
      </div>
    </li>)}
  </ul>
}
