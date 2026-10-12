import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useCustomerSourceText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

type Confirmation = { message: string; resolve: (confirmed: boolean) => void; invokingControl: HTMLElement | null }
let current: Confirmation | null = null
const listeners = new Set<() => void>()
const waiting: Confirmation[] = []
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const snapshot = () => current
const serverSnapshot = () => null
function emit() { listeners.forEach(listener => listener()) }
function finish(confirmed: boolean) {
  const previous = current
  current = waiting.shift() ?? null
  previous?.resolve(confirmed)
  emit()
}

/** Await an explicit Portal decision. Closing/Escape always keeps the draft. */
export function confirmPortal(message: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise(resolve => {
    const request = { message, resolve, invokingControl: document.activeElement instanceof HTMLElement ? document.activeElement : null }
    if (current) waiting.push(request)
    else { current = request; emit() }
  })
}

export function PortalConfirmation() {
  const translate = useCustomerSourceText()
  const text = useCustomerText()
  const saving = useIsMutating() > 0
  const request = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const keepId = useId()
  const invokingControl = useRef<HTMLElement | null>(null)
  useEffect(() => () => {
    current?.resolve(false)
    waiting.splice(0).forEach(item => item.resolve(false))
    current = null
    emit()
  }, [])
  const discard = request?.message.startsWith('Discard') === true
  return <Dialog open={Boolean(request)} onOpenChange={open => { if (!open) finish(false) }}>
    <DialogContent onOpenAutoFocus={event => {
      invokingControl.current = request?.invokingControl ?? null
      event.preventDefault()
      document.getElementById(keepId)?.focus()
    }} onCloseAutoFocus={event => {
      const control = invokingControl.current
      if (control?.isConnected) {
        event.preventDefault()
        control.focus()
        // The parent Radix focus scope resumes after the confirmation unmounts.
        requestAnimationFrame(() => { if (control.isConnected && !current) control.focus() })
      }
    }}>
      <DialogHeader><DialogTitle>{text(discard ? 'discard_title' : 'confirm_action')}</DialogTitle></DialogHeader>
      <div><DialogDescription>{request ? translate(request.message) : ''}</DialogDescription>{saving ? <p role="status">{text('confirmation_wait')}</p> : null}</div>
      <DialogFooter><Button id={keepId} variant="outline" onClick={() => finish(false)}>{text(discard ? 'keep_editing' : 'confirmation_cancel')}</Button>
        <Button variant="destructive" disabled={saving} onClick={() => finish(true)}>{text(discard ? 'discard_changes' : request?.message.startsWith('Remove') ? 'confirmation_remove' : 'confirm_action')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
