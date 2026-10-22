import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Department, Organization, RelationshipRequest } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  departmentId: z.string(),
  service: z.enum(['PSeqLabService', 'PSeqKit']),
  effectiveFrom: z.string().min(1, 'Select a start date.'),
  effectiveTo: z.string(),
  configurationStatus: z.enum(['Pending', 'Ready', 'Blocked']),
  sourceRequestId: z.string().trim(),
  notes: z.string().trim().max(2000),
})
export type EntitlementFormValues = z.infer<typeof schema>

export function EntitlementDialog({ error, isPending, onOpenChange, onSubmit, open, organization, requests, departments = [] }: { error?: string; isPending: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: EntitlementFormValues) => void; open: boolean; organization: Organization; requests: RelationshipRequest[]; departments?: Department[] }) {
  const form = useForm<EntitlementFormValues>({ resolver: zodResolver(schema), defaultValues: defaults(), mode: 'onBlur' })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting, open)

  useEffect(() => { if (open) form.reset(defaults()) }, [form, open])
  const selectedService = form.watch('service')
  const eligibleRequests = requests.filter((request) => request.organizationId === organization.id
    && (request.status === 'Approved' || request.status === 'Applied')
    && request.requestedServices.includes(selectedService))
  return <Dialog open={open} onOpenChange={open => { if (open) (onOpenChange)(open); else void __modalGuard.close(() => (onOpenChange)(false)) }}><DialogContent><DialogHeader><DialogTitle><CustomerSourceText source={"Add service entitlement"} /></DialogTitle><DialogDescription><CustomerSourceText source={"Entitlements are dated commercial permissions. Service configuration must be Ready before a current entitlement is usable."} /></DialogDescription></DialogHeader>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<form id="entitlement-form" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}><PortalField ><Label htmlFor="entitlement-department"><CustomerSourceText source={"Applies to"} /></Label><NativeSelect id="entitlement-department" className={selectClass} {...form.register('departmentId')}><option value=""><CustomerSourceText source={"All departments (organization default)"} /></option>{departments.filter((department) => department.isActive).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</NativeSelect></PortalField><PortalField ><Label htmlFor="entitlement-service"><CustomerSourceText source={"Service"} /></Label><NativeSelect id="entitlement-service" className={selectClass} {...form.register('service')}><option value="PSeqLabService"><CustomerSourceText source={"PSeq Lab Service"} /></option>{organization.kind === 'Partner' ? <option value="PSeqKit"><CustomerSourceText source={"PSeq Kit (includes data assembly)"} /></option> : null}</NativeSelect></PortalField><PortalField ><Label htmlFor="entitlement-from"><CustomerSourceText source={"Effective from"} /></Label><Input id="entitlement-from" type="datetime-local" {...form.register('effectiveFrom')} /></PortalField><PortalField ><Label htmlFor="entitlement-to"><CustomerSourceText source={"Effective to"} /></Label><Input id="entitlement-to" type="datetime-local" {...form.register('effectiveTo')} /></PortalField><PortalField ><Label htmlFor="entitlement-status"><CustomerSourceText source={"Service configuration"} /></Label><NativeSelect id="entitlement-status" className={selectClass} {...form.register('configurationStatus')}><option value="Pending"><CustomerSourceText source={"Pending"} /></option><option value="Ready"><CustomerSourceText source={"Ready"} /></option><option value="Blocked"><CustomerSourceText source={"Blocked"} /></option></NativeSelect></PortalField><PortalField ><Label htmlFor="entitlement-source"><CustomerSourceText source={"Approved source request"} /></Label><NativeSelect id="entitlement-source" className={selectClass} {...form.register('sourceRequestId')}><option value=""><CustomerSourceText source={"No linked request"} /></option>{eligibleRequests.map((request) => <option key={request.id} value={request.id}>{request.requestNumber} · {request.status} · {request.summary}</option>)}</NativeSelect>{eligibleRequests.length ? <p className="text-xs text-muted-foreground"><CustomerSourceText source={"Only approved or applied requests for the selected service are available."} /></p> : <p className="text-xs text-muted-foreground"><CustomerSourceText source={"No approved or applied requests include the selected service. Leave this unlinked only for a documented manual exception."} /></p>}</PortalField><div className="grid gap-1.5"><Label htmlFor="entitlement-notes"><CustomerSourceText source={"Internal notes"} /></Label><textarea id="entitlement-notes" className={textareaClass} rows={3} {...form.register('notes')} /></div></form><DialogFooter><Button type="button" variant="outline" onClick={() => { void __modalGuard.close(() => (() => onOpenChange(false))()) }}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="entitlement-form" disabled={isPending}>{isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Add entitlement"} />}</Button></DialogFooter></DialogContent></Dialog>
}

function defaults(): EntitlementFormValues {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  return { departmentId: '', service: 'PSeqLabService', effectiveFrom: local, effectiveTo: '', configurationStatus: 'Pending', sourceRequestId: '', notes: '' }
}
