import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Organization, PortalService } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  candidateOrganizationName: z.string().trim().min(1, 'Enter an organization name.'),
  requestType: z.enum(['Onboarding', 'Evaluation', 'ServiceChange', 'RelationshipChange', 'SalesAssistedOrder', 'Offboarding']),
  requestedOrganizationKind: z.enum(['Prospect', 'Customer', 'Partner']),
  sourceReference: z.string().trim().max(255),
  summary: z.string().trim().min(1, 'Describe the requested outcome.').max(2000),
  internalNotes: z.string().trim().max(4000),
  pseqLabService: z.boolean(),
  pseqKit: z.boolean(),
})

export type RelationshipRequestFormValues = z.infer<typeof schema>

export function RelationshipRequestDialog({ error, isPending, onOpenChange, onSubmit, open, organization }: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RelationshipRequestFormValues) => void
  open: boolean
  organization: Organization | null
}) {
  const form = useForm<RelationshipRequestFormValues>({ resolver: zodResolver(schema), defaultValues: valuesFor(organization), mode: 'onBlur' })
  useEffect(() => { if (open) form.reset(valuesFor(organization)) }, [form, open, organization])
  const kind = form.watch('requestedOrganizationKind')
  const kindField = form.register('requestedOrganizationKind')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Portal request</DialogTitle>
          <DialogDescription>Capture the business request for review. Approval will not silently provision access, services, or an order.</DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <form id="relationship-request" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {!organization ? <div className="grid gap-1.5"><Label htmlFor="request-candidate">Organization name <Required /></Label><Input id="request-candidate" {...form.register('candidateOrganizationName')} /></div> : null}
          <div className="grid gap-1.5"><Label htmlFor="request-type">Request type <Required /></Label><select id="request-type" className={selectClass} {...form.register('requestType')}><option value="Onboarding">Onboarding</option><option value="Evaluation">Evaluation</option><option value="ServiceChange">Service change</option><option value="RelationshipChange">Relationship change</option><option value="SalesAssistedOrder">Sales-assisted order</option><option value="Offboarding">Offboarding</option></select></div>
          <div className="grid gap-1.5"><Label htmlFor="request-kind">Requested relationship <Required /></Label><select id="request-kind" className={selectClass} {...kindField} onChange={(event) => { kindField.onChange(event); const nextKind = event.target.value; if (nextKind === 'Prospect') { form.setValue('pseqLabService', false); form.setValue('pseqKit', false) } else if (nextKind === 'Customer') { form.setValue('pseqKit', false) } }}><option value="Prospect">Prospect</option><option value="Customer">Customer</option><option value="Partner">Partner</option></select></div>
          <div className="grid gap-2"><Label>Requested services</Label><CheckField label="PSeq Lab Service" checked={form.watch('pseqLabService')} onCheckedChange={(checked) => form.setValue('pseqLabService', checked === true)} disabled={kind === 'Prospect'} /><CheckField label="PSeq Kit (includes data assembly)" checked={form.watch('pseqKit')} onCheckedChange={(checked) => form.setValue('pseqKit', checked === true)} disabled={kind !== 'Partner'} /></div>
          <div className="grid gap-1.5"><Label htmlFor="request-summary">Requested outcome <Required /></Label><textarea id="request-summary" className={textareaClass} rows={3} aria-invalid={Boolean(form.formState.errors.summary)} {...form.register('summary')} />{form.formState.errors.summary ? <p className="text-sm text-destructive" role="alert">{form.formState.errors.summary.message}</p> : null}</div>
          <div className="grid gap-1.5"><Label htmlFor="request-source">Source reference</Label><Input id="request-source" placeholder="HubSpot record or internal reference" {...form.register('sourceReference')} /></div>
          <div className="grid gap-1.5"><Label htmlFor="request-notes">Internal notes</Label><textarea id="request-notes" className={textareaClass} rows={3} {...form.register('internalNotes')} /></div>
        </form>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" form="relationship-request" disabled={isPending}>{isPending ? 'Submitting…' : 'Submit for review'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckField({ checked, disabled, label, onCheckedChange }: { checked: boolean; disabled: boolean; label: string; onCheckedChange: (checked: boolean | 'indeterminate') => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />{label}</label>
}

function Required() { return <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> }

function valuesFor(organization: Organization | null): RelationshipRequestFormValues {
  const kind = organization?.kind === 'Phaeno' ? 'Prospect' : (organization?.kind ?? 'Prospect')
  return { candidateOrganizationName: organization?.name ?? '', requestType: 'Onboarding', requestedOrganizationKind: kind, sourceReference: '', summary: '', internalNotes: '', pseqLabService: false, pseqKit: false }
}

export function requestedServices(values: RelationshipRequestFormValues): PortalService[] {
  return [values.pseqLabService ? 'PSeqLabService' : null, values.pseqKit ? 'PSeqKit' : null].filter((value): value is PortalService => value !== null)
}
