import type { ReactNode } from 'react'
import type { SampleShippingCrosswalkItem } from '#/api/sample-shipping'

export function SampleTubeRow({ item, containerLabel, source, active = false, action, scanForm }: {
  item: SampleShippingCrosswalkItem
  containerLabel?: string
  source?: string
  active?: boolean
  action?: ReactNode
  scanForm?: ReactNode
}) {
  const SampleName = active ? 'h3' : 'p'
  return <li aria-current={active ? 'step' : undefined} className={`grid items-center gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]${active ? ' border-l-2 border-primary bg-primary/5' : ''}`}>
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <SampleName className="wrap-anywhere text-sm font-semibold">{item.customerSampleId || 'Unmapped sample · Review required'}</SampleName>
          <p className="text-xs text-muted-foreground">Tube {item.tubeOrdinal ?? 1} of {item.totalSampleTubeCount ?? item.tubeCount ?? 1}{active ? ' · Matching now' : ''}</p>
        </div>
        {item.supplierTubeBarcode ? <p className="text-xs text-muted-foreground">Customer-declared material: {item.customerDeclaredQuantity == null ? 'Unknown' : `${item.customerDeclaredQuantity} ${item.customerDeclaredQuantityUnit ?? ''}`}</p> : null}
        {item.supplierTubeBarcode ? <p className="wrap-anywhere font-mono text-xs">Tube barcode: {item.supplierTubeBarcode}</p> : null}
        {source ? <p className="text-sm text-muted-foreground">{source}</p> : null}
        {containerLabel ? <p className="wrap-anywhere text-xs text-muted-foreground">{containerLabel}</p> : null}
        {!item.supplierTubeBarcode && !scanForm ? <p className="text-sm text-muted-foreground">Not matched</p> : null}
      </div>
    </div>
    {action ? <div className="justify-self-end">{action}</div> : null}
    {scanForm ? <div className="min-w-0 sm:col-span-full">{scanForm}</div> : null}
  </li>
}
