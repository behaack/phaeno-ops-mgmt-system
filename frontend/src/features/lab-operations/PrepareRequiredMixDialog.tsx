import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { listMasterMixWorkflows, masterMixWorkflowsKey, masterMixesKey, startMasterMix } from '#/api/lab-master-mix'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

export type RequiredMix = { workflowId: string; revision: number }
export function PrepareRequiredMixDialog({ requirement, onClose }: { requirement: RequiredMix; onClose: () => void }) {
  const client = useQueryClient()
  const request = useRef(crypto.randomUUID())
  const workflows = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows })
  const workflow = workflows.data?.find(item => item.id === requirement.workflowId && item.status !== 'Retired')
  const revision = workflow?.revisions.find(item => item.revision === requirement.revision && item.status === 'Approved')
  const start = useMutation({ mutationFn: () => startMasterMix(requirement.workflowId, requirement.revision, request.current), onSuccess: () => client.invalidateQueries({ queryKey: masterMixesKey }) })
  return <Dialog open onOpenChange={open => { if (!open && !start.isPending) onClose() }}><DialogContent><DialogHeader><DialogTitle>Prepare required master mix</DialogTitle></DialogHeader>
    <div className="space-y-3 text-sm">
      <p>Your entries stay in the waiting form. Complete the mix in a new tab, then return to select it and scan its container.</p>
      {workflows.isPending ? <p role="status">Loading the required recipe…</p> : workflows.isError ? <p role="alert">The required recipe could not be loaded.</p> : revision ? <p><strong>{revision.name}</strong> · approved revision {revision.revision}</p> : <p role="alert">This exact recipe revision is unavailable. Ask a supervisor to review the preparation workflow.</p>}
      {start.error ? <p role="alert" className="text-destructive">{getLabOperationsError(start.error, 'The mix could not be started. Retry uses the same request.')}</p> : null}
      {start.data ? <><p>Container: <strong className="break-all">{start.data.barcode}</strong></p><Button asChild><Link to="/lab-operations/master-mixes/$mixId" params={{ mixId: start.data.id }} target="_blank" rel="noopener noreferrer" onClick={onClose}>Continue mix preparation in a new tab</Link></Button></> : null}
    </div>
    <DialogFooter><Button type="button" variant="outline" disabled={start.isPending} onClick={onClose}>{start.data ? 'Return to waiting preparation' : 'Cancel'}</Button>{!start.data ? <Button type="button" disabled={!revision || start.isPending} onClick={() => start.mutate()}>{start.isPending ? 'Starting…' : 'Start required mix'}</Button> : null}</DialogFooter>
  </DialogContent></Dialog>
}
