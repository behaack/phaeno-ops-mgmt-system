import type { ReactNode } from 'react'
import type { SampleShippingCrosswalkItem } from '#/api/sample-shipping'
import { ShippingBarcode } from './ShippingBarcode'

export function SampleTubeRow({ item, containerLabel, source, active = false, action }: {
  item: SampleShippingCrosswalkItem
  containerLabel?: string
  source?: string
  active?: boolean
  action?: ReactNode
}) {
  return <li aria-current={active ? 'step' : undefined} className={`grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,1fr)_auto] sm:items-center${active ? ' border-l-2 border-primary bg-primary/5' : ''}`}>
    <div className="min-w-0"><p className="wrap-anywhere text-sm font-medium">{item.customerSampleId || 'Unmapped sample · Review required'}</p><p className="text-xs text-muted-foreground">Tube {item.tubeOrdinal ?? 1} of {item.totalSampleTubeCount ?? item.tubeCount ?? 1}{active ? ' · Matching now' : ''}</p>{source ? <p className="text-xs text-muted-foreground">{source}</p> : null}{containerLabel ? <p className="wrap-anywhere text-xs text-muted-foreground">{containerLabel}</p> : null}</div>
    {item.supplierTubeBarcode ? <div className="max-w-48 print:max-w-none"><ShippingBarcode value={item.supplierTubeBarcode} label="Tube barcode" /></div> : <p className="text-sm text-muted-foreground">Not matched</p>}
    {action}
  </li>
}
