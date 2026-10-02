import { useBlocker } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

export function useOrderDecisionDismissal(dirty: boolean, busy: boolean, onClose: () => void,
  wording = { scope: 'quote decision', description: 'The explanation and selected reason in this dialog will be discarded. The order and quote will remain unchanged.' }) {
  const [discardOpen, setDiscardOpen] = useState(false)
  const keepId = useId()
  const navigationApproved = useRef(false)
  useEffect(() => { if (!dirty && !busy) navigationApproved.current = false }, [dirty, busy])
  const blocker = useBlocker({ withResolver: true,
    shouldBlockFn: () => !navigationApproved.current && (dirty || busy),
    enableBeforeUnload: () => !navigationApproved.current && (dirty || busy) })
  function close() {
    if (busy) return
    if (dirty) setDiscardOpen(true)
    else onClose()
  }
  function keepEditing() {
    setDiscardOpen(false)
    if (blocker.status === 'blocked') blocker.reset()
  }
  function discard() {
    if (busy) return
    navigationApproved.current = true
    setDiscardOpen(false)
    if (blocker.status === 'blocked') blocker.proceed()
    else onClose()
  }
  return { close, confirmation: <Dialog open={discardOpen || blocker.status === 'blocked'} onOpenChange={open => { if (!open) keepEditing() }}>
    <DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById(keepId)?.focus() }}>
      <DialogHeader><DialogTitle>{busy ? wording.scope === 'quote decision' ? 'Quote decision is being sent' : 'Request is being sent' : `Discard unsaved ${wording.scope}?`}</DialogTitle></DialogHeader>
      <div><DialogDescription>{busy ? 'Wait for this request to finish before leaving. Your request is still being processed.' : wording.description}</DialogDescription></div>
      <DialogFooter><Button id={keepId} variant="outline" onClick={keepEditing}>Keep reviewing</Button><Button variant="destructive" disabled={busy} onClick={discard}>Discard changes</Button></DialogFooter>
    </DialogContent>
  </Dialog> }
}
