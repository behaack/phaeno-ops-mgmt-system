import { useRef, type ComponentProps, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogReturnFocus } from './ui/dialog'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'

/** The owning form retains save/reset semantics; dismissal and navigation share one guard. */
export function GuardedFormDialog({ open, onOpenChange, dirty, pending, children, returnFocusId, fallbackFocusId }: {
  open: boolean; onOpenChange: (open: boolean) => void; dirty: boolean; pending: boolean; children: ReactNode; returnFocusId?: string; fallbackFocusId?: string
}) {
  const guard = useModalDraftGuard(dirty, pending, open)
  const previous = useRef(false)
  const restore = useRef<{ target: HTMLElement | null; fallbackId?: string }>({ target: null })
  if (open && !previous.current && typeof document !== 'undefined') restore.current = {
    target: (returnFocusId ? document.getElementById(returnFocusId) : document.activeElement) as HTMLElement | null,
    fallbackId: fallbackFocusId ?? returnFocusId,
  }
  previous.current = open
  return <DialogReturnFocus {...restore.current}><Dialog open={open} onOpenChange={next => {
    if (next) onOpenChange(true)
    else void guard.close(() => onOpenChange(false))
  }}>{children}</Dialog></DialogReturnFocus>
}

export function ConfirmationFormContent({ children, ...props }: ComponentProps<typeof DialogContent>) {
  const content = useRef<HTMLDivElement>(null)
  return <DialogContent {...props} ref={content} onOpenAutoFocus={event => {
    props.onOpenAutoFocus?.(event)
    if (!event.defaultPrevented) {
      event.preventDefault()
      content.current?.querySelector<HTMLButtonElement>('[data-slot="dialog-footer"] button[type="button"]')?.focus()
    }
  }}>{children}</DialogContent>
}
