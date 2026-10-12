import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import type { Ref } from 'react'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function LabQuoteActions({ canAccept, canPropose, canDecline, canExtend, canDownload, downloadBusy, disabled, acceptanceBlocked, triggerRef, onAccept, onPropose, onDecline, onExtend, onDownload }: {
  canAccept: boolean; canDecline: boolean; disabled: boolean; acceptanceBlocked: boolean
  canPropose: boolean; triggerRef?: Ref<HTMLButtonElement>; onAccept: () => void; onPropose: () => void; onDecline: () => void
  canExtend: boolean; canDownload: boolean; downloadBusy: boolean; onExtend: () => void; onDownload: () => void
}) {
  const __customerText = useCustomerText()

  const hasDecisions = canAccept || canPropose || canDecline || canExtend
  if (!hasDecisions && !canDownload) return null
  return <span role="group" aria-label={__customerText('m_f959774a5fdd')} className="inline-flex">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={triggerRef} className={!hasDecisions ? "w-44 max-w-full" : undefined}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-56 max-w-[calc(100vw-2rem)] [&_[data-slot=dropdown-menu-item]]:whitespace-nowrap">
      {canAccept ? <DropdownMenuItem disabled={acceptanceBlocked || disabled} aria-describedby={acceptanceBlocked ? "quote-acceptance-help" : undefined} onSelect={onAccept}><CustomerText message="m_2190f8c3fb37" /></DropdownMenuItem> : null}
      {canPropose ? <DropdownMenuItem disabled={disabled} onSelect={onPropose}><CustomerText message="m_73eeb5083986" /></DropdownMenuItem> : null}
      {canDecline ? <DropdownMenuItem variant="destructive" disabled={disabled} onSelect={onDecline}><CustomerText message="m_001438985d9c" /></DropdownMenuItem> : null}
      {canExtend ? <DropdownMenuItem disabled={disabled} onSelect={onExtend}><CustomerText message="m_b28bda20ef31" /></DropdownMenuItem> : null}
      {canDownload ? <>{hasDecisions ? <DropdownMenuSeparator /> : null}<DropdownMenuItem disabled={disabled || downloadBusy} aria-busy={downloadBusy || undefined} onSelect={onDownload}><CustomerText message="m_b9bcacc3f85f" /></DropdownMenuItem></> : null}
    </DropdownMenuContent></ActionMenu>
  </span>
}
