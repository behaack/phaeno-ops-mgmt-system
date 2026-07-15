import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { getOrderErrorMessage, runPlatformAction, type CancellationRequest } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { OrderStatusBadge } from '../OrderStatusBadge'

export function CancellationDecisionPanel({ workflowPath, recordId, version, requests, reagentLines, onSaved }: { workflowPath: string; recordId: string; version: number; requests: CancellationRequest[]; reagentLines?: Array<{ id: string; description: string; remainingQuantity: number }>; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState<CancellationRequest | null>(null)
  const [decision, setDecision] = useState<'Approved' | 'PartiallyApproved' | 'Declined'>('Approved')
  const [reason, setReason] = useState('')
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({})
  const mutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('Select a cancellation request.')
      const lines = decision === 'PartiallyApproved' ? (reagentLines ?? []).map((line) => ({ orderLineId: line.id, quantity: Number(lineQuantities[line.id] ?? 0) })).filter((line) => line.quantity > 0) : undefined
      return runPlatformAction(`${workflowPath}/${recordId}/cancellation-requests/${selected.id}/decision`, { version, status: decision, reason, lines })
    },
    onSuccess: async () => { await onSaved(); setSelected(null); setReason(''); setDecision('Approved'); setLineQuantities({}) },
  })
  if (!requests.length) return null
  return <><Card><CardHeader><CardTitle>Cancellation requests</CardTitle><CardDescription>Decisions preserve completed work, shipment, release, and financial history.</CardDescription></CardHeader><CardContent className="space-y-3">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"><div><div className="flex items-center gap-2"><span className="font-medium">Requested {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(request.createdAt))}</span><OrderStatusBadge status={request.status} /></div><p className="mt-2 text-sm">{request.reason}</p>{request.decisionReason ? <p className="mt-1 text-sm text-muted-foreground">Decision: {request.decisionReason}</p> : null}</div>{request.status === 'Pending' ? <Button type="button" variant="outline" onClick={() => setSelected(request)}>Decide request</Button> : null}</div>)}</CardContent></Card><Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>Decide cancellation request</DialogTitle><DialogDescription>Use a tenant-safe decision reason. Record internal commercial details separately through QuickBooks and authorized operational notes.</DialogDescription></DialogHeader><div><Label htmlFor="cancellationDecision">Decision *</Label><select id="cancellationDecision" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="Approved">Approve</option>{reagentLines ? <option value="PartiallyApproved">Partially approve</option> : null}<option value="Declined">Decline</option></select></div>{decision === 'PartiallyApproved' && reagentLines ? <fieldset className="space-y-3"><legend className="text-sm font-medium">Quantities to cancel *</legend>{reagentLines.filter((line) => line.remainingQuantity > 0).map((line) => <div key={line.id}><Label htmlFor={`cancel-${line.id}`}>{line.description} ({line.remainingQuantity} remaining)</Label><input id={`cancel-${line.id}`} type="number" min="0" max={line.remainingQuantity} step="any" value={lineQuantities[line.id] ?? ''} onChange={(event) => setLineQuantities((current) => ({ ...current, [line.id]: event.target.value }))} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" /></div>)}</fieldset> : null}<div><Label htmlFor="cancellationDecisionReason">Tenant-safe reason *</Label><textarea id="cancellationDecisionReason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>{mutation.error ? <Alert variant="destructive"><AlertTitle>Decision was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Reload and try again.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={!reason.trim() || (decision === 'PartiallyApproved' && !Object.values(lineQuantities).some((value) => Number(value) > 0)) || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save decision'}</Button></DialogFooter></DialogContent></Dialog></>
}
