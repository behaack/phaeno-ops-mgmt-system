import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { RefObject } from 'react'
import { Button } from '#/components/ui/button'

import type { ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'

export function LabJobWorkspaceActions({ orderActions, shipmentActions = [], shipmentLabel, triggerRef, dialogOpen = false }: {
  orderActions: ShipmentHeaderAction[]
  shipmentActions?: ShipmentHeaderAction[]
  shipmentLabel?: string
  triggerRef: RefObject<HTMLButtonElement | null>
  dialogOpen?: boolean
}) {
  const __customerText = useCustomerText()

  const actions = [...shipmentActions, ...orderActions]
  if (!actions.length) return null
  const keepSingleActionInMenu = actions.some(action => action.keepInMenu)
  const content = (action: ShipmentHeaderAction) => <>{action.icon ? <action.icon aria-hidden="true" data-icon="inline-start" /> : null}{action.label}</>
  if (actions.length === 1 && !keepSingleActionInMenu) return <Button ref={triggerRef} variant={actions[0].variant === 'destructive' ? "destructive" : undefined} disabled={actions[0].disabled} aria-busy={actions[0].busy || undefined} aria-describedby={actions[0].descriptionId} onClick={actions[0].onSelect}>{content(actions[0])}</Button>
  const items = (values: ShipmentHeaderAction[]) => values.map(action => <DropdownMenuItem key={action.label} variant={action.variant === 'destructive' ? "destructive" : "default"} disabled={action.disabled} aria-busy={action.busy || undefined} aria-describedby={action.descriptionId} onSelect={action.onSelect}>{content(action)}</DropdownMenuItem>)
  return <ActionMenu keepSingleActionInMenu={keepSingleActionInMenu}>
    <DropdownMenuTrigger asChild><Button ref={triggerRef} variant={actions.length === 1 ? "outline" : undefined} disabled={actions.length === 1 && actions[0].disabled} aria-busy={actions.length === 1 && actions[0].busy || undefined} aria-describedby={actions.length === 1 ? actions[0].descriptionId : undefined}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={event => { if (dialogOpen) event.preventDefault() }}>
      {shipmentActions.length ? <><DropdownMenuLabel className="whitespace-normal wrap-anywhere">{shipmentLabel ? __customerText('m_5eb853ff5c56', { p0: String(shipmentLabel) }) : __customerText('m_ad5751430e29')}</DropdownMenuLabel>{items(shipmentActions)}</> : null}
      {orderActions.length ? <>{shipmentActions.length ? <DropdownMenuSeparator /> : null}<DropdownMenuLabel><CustomerText message="m_b5c720f9b8f7" /></DropdownMenuLabel>{items(orderActions)}</> : null}
    </DropdownMenuContent>
  </ActionMenu>
}
