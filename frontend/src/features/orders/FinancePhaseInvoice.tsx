import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getPhaseBillingJobs, getPhaseBillingPlan, type PhaseBillingPlan } from '#/api/lab-phases'
import { getOrderErrorMessage } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { PhaseInvoiceDialog } from './LabPhaseDialogs'

export function FinancePhaseInvoice({ enabled, customerId, onSaved }: { enabled: boolean; customerId: string; onSaved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const [snapshot, setSnapshot] = useState<PhaseBillingPlan | null>(null)
  const jobs = useQuery({ queryKey: ['accounts-receivable', 'phase-jobs', customerId, search, page],
    queryFn: () => getPhaseBillingJobs(search, customerId, page), enabled: enabled && open })
  const plan = useQuery({ queryKey: ['accounts-receivable', 'phase-plan', selected],
    queryFn: () => getPhaseBillingPlan(selected), enabled: enabled && open && Boolean(selected) })
  return <>
    <Button disabled={!enabled} onClick={() => { setSelected(''); setOpen(true) }}>Issue phase invoice</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Select a Job to invoice</DialogTitle><DialogDescription>Choose an accepted Job, then enter the agreed billing portions for its phases.</DialogDescription></DialogHeader>
      <Label htmlFor="phase-invoice-job-search">Find Job or Customer</Label><Input id="phase-invoice-job-search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); setSelected('') }} />
      {jobs.isLoading ? <p role="status">Loading Jobs…</p> : null}
      {jobs.error || plan.error ? <p role="alert">{getOrderErrorMessage(jobs.error ?? plan.error, 'Billing information could not be loaded.')} <Button variant="outline" onClick={() => { void jobs.refetch(); if (selected) void plan.refetch() }}>Retry</Button></p> : null}
      <div className="max-h-64 space-y-2 overflow-auto">{jobs.data?.items.map(job => <label key={job.id} className="flex cursor-pointer items-start gap-2 rounded-md border p-3"><input type="radio" name="phase-invoice-job" checked={selected === job.id} onChange={() => setSelected(job.id)} className="mt-1 accent-primary" /><span>{job.orderNumber} · {job.jobName}<span className="block text-sm text-muted-foreground">{job.organizationName}</span></span></label>)}</div>
      {jobs.data && !jobs.data.items.length ? <p>No accepted Jobs match this view.</p> : null}
      <div className="flex items-center gap-2"><Button variant="outline" disabled={page === 1 || jobs.isFetching} onClick={() => { setPage(p => p - 1); setSelected('') }}>Previous</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={!jobs.data?.hasMore || jobs.isFetching} onClick={() => { setPage(p => p + 1); setSelected('') }}>Next</Button></div>
      {selected && plan.isLoading ? <p role="status">Loading phase balances…</p> : null}
      {plan.data && !plan.data.phases.some(p => p.lifecycle !== 'Cancelled' && p.acceptedSubtotal > p.invoicedSubtotal) ? <p>No uninvoiced active phase portions remain. Finance adjustments are handled on issued invoices.</p> : null}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!plan.data?.phases.some(p => p.lifecycle !== 'Cancelled' && p.acceptedSubtotal > p.invoicedSubtotal) || plan.isFetching} onClick={() => { if (plan.data) { setSnapshot(plan.data); setOpen(false) } }}>Choose billing portions</Button></DialogFooter>
    </DialogContent></Dialog>
    {snapshot ? <PhaseInvoiceDialog orderId={snapshot.orderId} plan={snapshot} onSaved={onSaved} onClose={() => setSnapshot(null)} /> : null}
  </>
}
