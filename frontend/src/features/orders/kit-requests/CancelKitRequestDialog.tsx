import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { cancelPlatformTransportationKitRequest, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { kitRequestReference } from './kit-request-navigation'
import { useOrderDecisionDismissal } from '../use-order-decision-dismissal'

export function CancelKitRequestDialog({ request, onClose, onSaved }: { request: TransportationKitRequest; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState(''), attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const mutation = useMutation({ mutationFn: () => {
    const input = { version: request.version, reason: reason.trim() || undefined }, fingerprint = JSON.stringify(input)
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    return cancelPlatformTransportationKitRequest(request.id, input, attempt.current.key)
  }, onSuccess: async () => { await onSaved() } })
  const dismissal = useOrderDecisionDismissal(Boolean(reason.trim()), mutation.isPending, onClose, { scope: 'cancellation reason', description: 'The unsaved cancellation reason will be discarded. This kit order will remain active.' })
  function close() { dismissal.close() }
  return <><Dialog open onOpenChange={open => { if (!open) close() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("keep-kit-request")?.focus() }}><DialogHeader><DialogTitle>Cancel kit request</DialogTitle></DialogHeader><div><DialogDescription>Cancel {kitRequestReference(request)} for Job {request.jobNumber}. The Customer can submit a new request. Cancellation is available only before dispatch.</DialogDescription></div>{mutation.error ? <Alert variant="destructive"><AlertTitle>Request was not cancelled</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Refresh the request and try again.')}</AlertDescription></Alert> : null}<div className="space-y-2"><Label htmlFor="cancel-kit-request-reason">Reason (optional)</Label><Textarea id="cancel-kit-request-reason" rows={3} maxLength={2000} disabled={mutation.isPending} value={reason} onChange={event => setReason(event.target.value)} /></div><DialogFooter><Button id="keep-kit-request" variant="outline" disabled={mutation.isPending} onClick={close}>Keep request</Button><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Cancelling…' : 'Cancel request'}</Button></DialogFooter></DialogContent></Dialog>{dismissal.confirmation}</>
}
