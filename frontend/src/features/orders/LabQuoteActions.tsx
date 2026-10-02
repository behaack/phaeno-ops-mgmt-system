import type { Ref } from 'react'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function LabQuoteActions({ canAccept, canPropose, canDecline, canExtend, canDownload, downloadBusy, disabled, acceptanceBlocked, triggerRef, onAccept, onPropose, onDecline, onExtend, onDownload }: {
  canAccept: boolean; canDecline: boolean; disabled: boolean; acceptanceBlocked: boolean
  canPropose: boolean; triggerRef?: Ref<HTMLButtonElement>; onAccept: () => void; onPropose: () => void; onDecline: () => void
  canExtend: boolean; canDownload: boolean; downloadBusy: boolean; onExtend: () => void; onDownload: () => void
}) {
  const hasDecisions = canAccept || canPropose || canDecline || canExtend
  if (!hasDecisions && !canDownload) return null
  return <span role="group" aria-label="Quote actions" className="inline-flex">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={triggerRef} className={!hasDecisions ? 'w-44 max-w-full' : undefined}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-56 max-w-[calc(100vw-2rem)] [&_[data-slot=dropdown-menu-item]]:whitespace-nowrap">
      {canAccept ? <DropdownMenuItem disabled={acceptanceBlocked || disabled} aria-describedby={acceptanceBlocked ? 'quote-acceptance-help' : undefined} onSelect={onAccept}>Accept quote</DropdownMenuItem> : null}
      {canPropose ? <DropdownMenuItem disabled={disabled} onSelect={onPropose}>Propose changes</DropdownMenuItem> : null}
      {canDecline ? <DropdownMenuItem variant="destructive" disabled={disabled} onSelect={onDecline}>Decline quote</DropdownMenuItem> : null}
      {canExtend ? <DropdownMenuItem disabled={disabled} onSelect={onExtend}>Request quote extension</DropdownMenuItem> : null}
      {canDownload ? <>{hasDecisions ? <DropdownMenuSeparator /> : null}<DropdownMenuItem disabled={disabled || downloadBusy} aria-busy={downloadBusy || undefined} onSelect={onDownload}>Download quote PDF</DropdownMenuItem></> : null}
    </DropdownMenuContent></ActionMenu>
  </span>
}
