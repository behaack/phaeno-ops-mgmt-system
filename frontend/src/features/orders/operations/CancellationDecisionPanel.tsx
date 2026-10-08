import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { getOrderErrorMessage, runPlatformAction, type CancellationRequest } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter as DialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { OrderStatusBadge } from '../OrderStatusBadge'

type Props = {
  workflowPath: string; recordId: string; version: number; requests: CancellationRequest[]
  reagentLines?: Array<{ id: string; description: string; remainingQuantity: number }>
  labSamples?: Array<{ id: string; customerSampleId: string; status: string }>
  onSaved: () => Promise<void>
}

export function CancellationDecisionPanel({ workflowPath, recordId, version, requests, reagentLines, labSamples, onSaved }: Props) {
  const [selected, setSelected] = useState<CancellationRequest | null>(null)
  const [reviewedVersion, setReviewedVersion] = useState(version)
  const [decision, setDecision] = useState<'Approved' | 'PartiallyApproved' | 'Declined'>('Approved')
  const [reason, setReason] = useState('')
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({})
  const [sampleIds, setSampleIds] = useState<string[]>([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const keepEditing = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (confirmDiscard) keepEditing.current?.focus() }, [confirmDiscard])
  const close = () => { setSelected(null); setConfirmDiscard(false) }
  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a cancellation request.')
      const lines = decision === 'PartiallyApproved' && reagentLines ? reagentLines.map(line => ({ orderLineId: line.id, quantity: Number(lineQuantities[line.id] ?? 0) })).filter(line => line.quantity > 0) : undefined
      return runPlatformAction(`${workflowPath}/${recordId}/cancellation-requests/${selected.id}/decision`, {
        version: reviewedVersion, status: decision, reason, lines,
        sampleIds: decision === 'PartiallyApproved' && labSamples ? sampleIds : undefined,
      })
    },
    onSuccess: async () => { close(); await onSaved() },
  })
  const requestClose = () => {
    if (mutation.isPending) return
    if (reason || decision !== 'Approved' || Object.keys(lineQuantities).length || sampleIds.length) setConfirmDiscard(true)
    else close()
  }
  const partialValid = labSamples
    ? sampleIds.length > 0 && sampleIds.length < labSamples.filter(sample => sample.status !== 'Cancelled').length
    : Object.values(lineQuantities).some(value => Number(value) > 0)
  if (!requests.length) return null
  return <>
    <Card>
      <CardHeader><CardTitle>Cancellation requests</CardTitle><CardDescription>Decisions preserve completed work, shipment, release, and financial history.</CardDescription></CardHeader>
      <CardContent className="space-y-3">{requests.map(request => <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
        <div><div className="flex items-center gap-2"><span className="font-medium">Requested {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(request.createdAt))}</span><OrderStatusBadge status={request.status} /></div>
          <p className="mt-2 text-sm">{request.reason}</p>{request.decisionReason ? <p className="mt-1 text-sm text-muted-foreground">Decision: {request.decisionReason}</p> : null}</div>
        {request.status === 'Pending' ? <Button type="button" variant="outline" onClick={() => {
          setSelected(request); setReviewedVersion(version); setReason(''); setDecision('Approved'); setLineQuantities({}); setSampleIds([]); setConfirmDiscard(false); mutation.reset()
        }}>Decide request</Button> : null}
      </div>)}</CardContent>
    </Card>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) requestClose() }}>
      <DialogContent><DialogHeader><DialogTitle>Decide cancellation request</DialogTitle><DialogDescription>Explain the decision for the Customer. Keep private operational details in authorized internal notes.</DialogDescription></DialogHeader>
        {confirmDiscard ? <div role="alert" className="space-y-3"><p>Discard your unsaved cancellation decision?</p><div className="flex flex-wrap gap-2"><Button ref={keepEditing} type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={close}>Discard changes</Button></div></div> : null}
        <fieldset disabled={mutation.isPending || confirmDiscard} className="space-y-4">
          <div><Label htmlFor="cancellationDecision"><RequiredFieldName>Decision</RequiredFieldName></Label><select id="cancellationDecision" required value={decision} onChange={event => setDecision(event.target.value as typeof decision)} className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"><option value="Approved">Approve</option>{reagentLines || labSamples ? <option value="PartiallyApproved">Partially approve</option> : null}<option value="Declined">Decline</option></select></div>
          {decision === 'PartiallyApproved' && reagentLines ? <fieldset className="space-y-3"><legend className="text-sm font-medium"><RequiredFieldName>Quantities to cancel</RequiredFieldName></legend>{reagentLines.filter(line => line.remainingQuantity > 0).map(line => <div key={line.id}><Label htmlFor={`cancel-${line.id}`}>{line.description} ({line.remainingQuantity} remaining)</Label><input id={`cancel-${line.id}`} type="number" min="0" max={line.remainingQuantity} step="any" value={lineQuantities[line.id] ?? ''} onChange={event => setLineQuantities(current => ({ ...current, [line.id]: event.target.value }))} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>)}</fieldset> : null}
          {decision === 'PartiallyApproved' && labSamples ? <fieldset className="space-y-3"><legend className="text-sm font-medium"><RequiredFieldName>Samples to cancel</RequiredFieldName></legend><p className="text-sm text-muted-foreground">Select samples awaiting receipt. The Lab checks their current eligibility when you save. Remaining work continues; the accepted quote stays unchanged. Any credit is reviewed separately.</p><div className="max-h-56 space-y-2 overflow-y-auto">{labSamples.map(sample => <Label key={sample.id} className="flex items-center gap-2 rounded border p-2"><input type="checkbox" className="size-4 cursor-pointer accent-primary" disabled={sample.status !== 'Expected'} checked={sampleIds.includes(sample.id)} onChange={event => setSampleIds(current => event.target.checked ? [...current, sample.id] : current.filter(id => id !== sample.id))} /><span>{sample.customerSampleId} · {sample.status}</span></Label>)}</div></fieldset> : null}
          <div><Label htmlFor="cancellationDecisionReason"><RequiredFieldName>Reason for the Customer</RequiredFieldName></Label><textarea id="cancellationDecisionReason" required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        </fieldset>
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Decision was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Reload and review current records before trying again.')}</AlertDescription></Alert> : null}
        <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending || confirmDiscard} onClick={requestClose}>Cancel</Button><Button type="button" disabled={!reason.trim() || (decision === 'PartiallyApproved' && !partialValid) || mutation.isPending || confirmDiscard} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save decision'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
