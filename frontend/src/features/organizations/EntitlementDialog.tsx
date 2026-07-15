import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Organization, RelationshipRequest } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  service: z.enum(['PSeqLabService', 'PSeqKit']),
  effectiveFrom: z.string().min(1, 'Select a start date.'),
  effectiveTo: z.string(),
  configurationStatus: z.enum(['Pending', 'Ready', 'Blocked']),
  sourceRequestId: z.string().trim(),
  notes: z.string().trim().max(2000),
})
export type EntitlementFormValues = z.infer<typeof schema>

export function EntitlementDialog({ error, isPending, onOpenChange, onSubmit, open, organization, requests }: { error?: string; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: EntitlementFormValues) => void; open: boolean; organization: Organization; requests: RelationshipRequest[] }) {
  const form = useForm<EntitlementFormValues>({ resolver: zodResolver(schema), defaultValues: defaults(), mode: 'onBlur' })
  useEffect(() => { if (open) form.reset(defaults()) }, [form, open])
  const selectedService = form.watch('service')
  const eligibleRequests = requests.filter((request) => request.organizationId === organization.id
    && (request.status === 'Approved' || request.status === 'Applied')
    && request.requestedServices.includes(selectedService))
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Add service entitlement</DialogTitle><DialogDescription>Entitlements are dated commercial permissions. Configuration must be Ready before a current entitlement is usable.</DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="entitlement-form" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><div className="grid gap-1.5"><Label htmlFor="entitlement-service">Service</Label><select id="entitlement-service" className={selectClass} {...form.register('service')}><option value="PSeqLabService">PSeq Lab Service</option>{organization.kind === 'Partner' ? <option value="PSeqKit">PSeq Kit (includes data assembly)</option> : null}</select></div><div className="grid gap-1.5"><Label htmlFor="entitlement-from">Effective from</Label><Input id="entitlement-from" type="datetime-local" {...form.register('effectiveFrom')} /></div><div className="grid gap-1.5"><Label htmlFor="entitlement-to">Effective to</Label><Input id="entitlement-to" type="datetime-local" {...form.register('effectiveTo')} /></div><div className="grid gap-1.5"><Label htmlFor="entitlement-status">Configuration</Label><select id="entitlement-status" className={selectClass} {...form.register('configurationStatus')}><option value="Pending">Pending</option><option value="Ready">Ready</option><option value="Blocked">Blocked</option></select></div><div className="grid gap-1.5"><Label htmlFor="entitlement-source">Approved source request</Label><select id="entitlement-source" className={selectClass} {...form.register('sourceRequestId')}><option value="">No linked request</option>{eligibleRequests.map((request) => <option key={request.id} value={request.id}>{request.requestNumber} · {request.status} · {request.summary}</option>)}</select>{eligibleRequests.length ? <p className="text-xs text-muted-foreground">Only approved or applied requests for the selected service are available.</p> : <p className="text-xs text-muted-foreground">No approved or applied requests include the selected service. Leave this unlinked only for a documented manual exception.</p>}</div><div className="grid gap-1.5"><Label htmlFor="entitlement-notes">Internal notes</Label><textarea id="entitlement-notes" className={textareaClass} rows={3} {...form.register('notes')} /></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="entitlement-form" disabled={isPending}>{isPending ? 'Saving…' : 'Add entitlement'}</Button></DialogFooter></DialogContent></Dialog>
}

function defaults(): EntitlementFormValues {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  return { service: 'PSeqLabService', effectiveFrom: local, effectiveTo: '', configurationStatus: 'Pending', sourceRequestId: '', notes: '' }
}
