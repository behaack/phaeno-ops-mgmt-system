import { ChevronDown } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '#/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import type { ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'

export function LabJobWorkspaceActions({ orderActions, shipmentActions = [], shipmentLabel, triggerRef, dialogOpen = false }: {
  orderActions: ShipmentHeaderAction[]
  shipmentActions?: ShipmentHeaderAction[]
  shipmentLabel?: string
  triggerRef: RefObject<HTMLButtonElement | null>
  dialogOpen?: boolean
}) {
  const actions = [...shipmentActions, ...orderActions]
  if (!actions.length) return null
  const content = (action: ShipmentHeaderAction) => <>{action.icon ? <action.icon aria-hidden="true" data-icon="inline-start" /> : null}{action.label}</>
  if (actions.length === 1) return <Button ref={triggerRef} disabled={actions[0].disabled} aria-busy={actions[0].busy || undefined} aria-describedby={actions[0].descriptionId} onClick={actions[0].onSelect}>{content(actions[0])}</Button>
  const items = (values: ShipmentHeaderAction[]) => values.map(action => <DropdownMenuItem key={action.label} disabled={action.disabled} aria-busy={action.busy || undefined} aria-describedby={action.descriptionId} onSelect={action.onSelect}>{content(action)}</DropdownMenuItem>)
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button ref={triggerRef}>Actions<ChevronDown aria-hidden="true" data-icon="inline-end" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={event => { if (dialogOpen) event.preventDefault() }}>
      {shipmentActions.length ? <><DropdownMenuLabel className="whitespace-normal wrap-anywhere">{shipmentLabel ? `Selected shipment · ${shipmentLabel}` : 'Shipping'}</DropdownMenuLabel>{items(shipmentActions)}</> : null}
      {orderActions.length ? <>{shipmentActions.length ? <DropdownMenuSeparator /> : null}<DropdownMenuLabel>This order</DropdownMenuLabel>{items(orderActions)}</> : null}
    </DropdownMenuContent>
  </DropdownMenu>
}
