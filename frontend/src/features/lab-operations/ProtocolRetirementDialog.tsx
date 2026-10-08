import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getProtocolRetirementImpact, getLabOperationsError, type LabProtocol } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const retirementSchema = z.object({ reason: z.string().trim().min(1, 'Enter a retirement reason.').max(1000, 'Use 1,000 characters or fewer.') })

export function ProtocolRetirementDialog({ protocol, pending, error, onClose, onRetire }: {
  protocol: LabProtocol
  pending: boolean
  error?: string
  onClose: () => void
  onRetire: (reason: string, impactToken: string, confirmImpact: boolean) => void
}) {
  const form = useForm<z.infer<typeof retirementSchema>>({ resolver: zodResolver(retirementSchema), defaultValues: { reason: '' } })
  const impact = useQuery({ queryKey: ['protocol-retirement-impact', protocol.id], queryFn: () => getProtocolRetirementImpact(protocol.id), staleTime: 0 })
  const affected = Boolean(impact.data && (impact.data.workflows.length || impact.data.queuedWork.length))
  const blocked = !impact.data || impact.isFetching || Boolean(impact.error) || impact.data.activeWork.length > 0
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose() }}>
    <DialogContent>
      <form noValidate onSubmit={form.handleSubmit(({ reason }) => { if (!pending && !blocked && impact.data) onRetire(reason, impact.data.impactToken, affected) })}>
        <DialogHeader>
          <DialogTitle>Retire protocol?</DialogTitle>
          <DialogDescription>Retire {protocol.name}. It will no longer be available for new use. Its versions, approvals and execution history remain available. Discard any open protocol draft first. Retirement cannot be undone here.</DialogDescription>
        </DialogHeader>
        {impact.isFetching ? <p role="status">Checking workflows and samples in process…</p> : null}
        {impact.error ? <Alert variant="destructive"><AlertTitle>Retirement impact could not be checked</AlertTitle><AlertDescription>{getLabOperationsError(impact.error, 'Try again.')}</AlertDescription></Alert> : null}
        {impact.data?.activeWork.length ? <Alert variant="destructive"><AlertTitle>Samples are in process</AlertTitle><AlertDescription>Retirement is blocked until processing is finished on these jobs:<ul>{impact.data.activeWork.map((job) => <li key={job.id}><Link to="/lab-operations/$workOrderId" params={{ workOrderId: job.id }} search={{ section: undefined }} className="underline">{job.reference}</Link></li>)}</ul></AlertDescription></Alert> : null}
        {impact.data?.workflows.length ? <Alert><AlertTitle>Affected workflows will become invalid</AlertTitle><AlertDescription>The protocol will be removed from new workflow revisions. Review and approve those revisions before putting them back into production.<ul>{impact.data.workflows.map((name) => <li key={name}>{name}</li>)}</ul></AlertDescription></Alert> : null}
        {impact.data?.queuedWork.length ? <Alert><AlertTitle>Assigned work may be stranded</AlertTitle><AlertDescription>These jobs have not started. Their original workflow assignments will remain, and they will be blocked from starting. Proceed anyway?<ul>{impact.data.queuedWork.map((job) => <li key={job.id}>{job.reference}</li>)}</ul></AlertDescription></Alert> : null}
        {error || impact.error ? <Button type="button" variant="outline" disabled={pending || impact.isFetching} onClick={() => void impact.refetch()}>Refresh impact</Button> : null}
        <div className="space-y-2">
          <Label htmlFor="protocol-retirement-reason"><RequiredFieldName>Retirement reason</RequiredFieldName></Label>
          <textarea id="protocol-retirement-reason" required maxLength={1000} rows={3} disabled={pending}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'protocol-retirement-reason-error' : undefined}
            {...form.register('reason')} />
          {form.formState.errors.reason ? <p id="protocol-retirement-reason-error" role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Protocol was not retired</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <RequiredDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending || blocked}>{pending ? 'Retiring…' : affected ? 'Proceed anyway' : 'Retire protocol'}</Button>
        </RequiredDialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
