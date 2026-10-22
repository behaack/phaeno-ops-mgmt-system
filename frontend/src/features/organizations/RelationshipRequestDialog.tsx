import { FieldError } from '#/components/ui/field'
import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { Organization, PortalService } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredMark as Required } from '#/components/ui/required-field'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  candidateOrganizationName: z.string().trim().min(1, 'Enter an organization name.'),
  requestType: z.enum(['Onboarding', 'Evaluation', 'ServiceChange', 'RelationshipChange', 'SalesAssistedOrder', 'Offboarding']),
  requestedOrganizationKind: z.enum(['Prospect', 'Customer', 'Partner']),
  sourceReference: z.string().trim().max(255),
  summary: z.string().trim().max(2000),
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
  const __customerSource = useCustomerSourceText()

  const form = useForm<RelationshipRequestFormValues>({ resolver: zodResolver(schema), defaultValues: valuesFor(organization), mode: 'onBlur' })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting, open)

  useEffect(() => { if (open) form.reset(valuesFor(organization)) }, [form, open, organization])
  const kind = form.watch('requestedOrganizationKind')
  const requestType = form.watch('requestType')
  const kindField = form.register('requestedOrganizationKind')
  const requestTypeField = form.register('requestType')
  const showServices = supportsRequestedServices(requestType)

  return (
    <Dialog open={open} onOpenChange={open => { if (open) (onOpenChange)(open); else void __modalGuard.close(() => (onOpenChange)(false)) }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{organization ? <CustomerSourceText source={"New Portal request"} /> : <CustomerSourceText source={"New Portal account request"} />}</DialogTitle>
          <DialogDescription>{organization ? <CustomerSourceText source={"Capture the business request for review. Online access and product or service access are approved separately."} /> : <CustomerSourceText source={"Submit an exceptional migration or recovery request for review. Approval creates online access only; product and service entitlements remain separate."} />}</DialogDescription>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        </DialogHeader>
        <form id="relationship-request" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {!organization ? <PortalField ><Label htmlFor="request-candidate"><CustomerSourceText source={"Organization name"} /> <Required /></Label><Input id="request-candidate" aria-invalid={Boolean(form.formState.errors.candidateOrganizationName)} {...form.register('candidateOrganizationName')} />{form.formState.errors.candidateOrganizationName ? <FieldError  role="alert">{<CustomerSourceText source={form.formState.errors.candidateOrganizationName.message} />}</FieldError> : null}</PortalField> : null}
          <PortalField ><Label htmlFor="request-type"><CustomerSourceText source={"Request type"} /> <Required /></Label><NativeSelect id="request-type" className={selectClass} {...requestTypeField} onChange={(event) => { requestTypeField.onChange(event); if (!supportsRequestedServices(event.target.value as RelationshipRequestFormValues['requestType'])) { form.setValue('pseqLabService', false); form.setValue('pseqKit', false) } }}><option value="Onboarding"><CustomerSourceText source={"Onboarding"} /></option><option value="Evaluation"><CustomerSourceText source={"Evaluation"} /></option>{organization ? <><option value="ServiceChange"><CustomerSourceText source={"Service change"} /></option><option value="RelationshipChange"><CustomerSourceText source={"Relationship change"} /></option><option value="SalesAssistedOrder"><CustomerSourceText source={"Sales-assisted order"} /></option><option value="Offboarding"><CustomerSourceText source={"Offboarding"} /></option></> : null}</NativeSelect></PortalField>
          <PortalField ><Label htmlFor="request-kind"><CustomerSourceText source={"Requested relationship"} /> <Required /></Label><NativeSelect id="request-kind" className={selectClass} {...kindField} onChange={(event) => { kindField.onChange(event); const nextKind = event.target.value; if (nextKind === 'Prospect') { form.setValue('pseqLabService', false); form.setValue('pseqKit', false) } else if (nextKind === 'Customer') { form.setValue('pseqKit', false) } }}><option value="Prospect"><CustomerSourceText source={"Prospect"} /></option><option value="Customer"><CustomerSourceText source={"Customer"} /></option><option value="Partner"><CustomerSourceText source={"Partner"} /></option></NativeSelect></PortalField>
          {showServices ? <div className="grid gap-2"><Label><CustomerSourceText source={"Requested products and services"} /></Label><CheckField label="PSeq Lab Service" checked={form.watch('pseqLabService')} onCheckedChange={(checked) => form.setValue('pseqLabService', checked === true)} disabled={kind === 'Prospect'} /><CheckField label="PSeq Kit (includes data assembly)" checked={form.watch('pseqKit')} onCheckedChange={(checked) => form.setValue('pseqKit', checked === true)} disabled={kind !== 'Partner'} /></div> : null}
          <div className="grid gap-1.5"><Label htmlFor="request-summary"><CustomerSourceText source={"Summary"} /></Label><textarea id="request-summary" className={textareaClass} rows={3} placeholder={__customerSource("Optional context for the reviewer")} aria-invalid={Boolean(form.formState.errors.summary)} {...form.register('summary')} />{form.formState.errors.summary ? <p className="text-sm text-destructive" role="alert">{<CustomerSourceText source={form.formState.errors.summary.message} />}</p> : null}</div>
          <PortalField ><Label htmlFor="request-source"><CustomerSourceText source={"Source reference"} /></Label><Input id="request-source" placeholder={__customerSource("Internal or approved external reference")} {...form.register('sourceReference')} /></PortalField>
        </form>
        <RequiredDialogFooter><Button type="button" variant="outline" onClick={() => { void __modalGuard.close(() => (() => onOpenChange(false))()) }}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="relationship-request" disabled={isPending}>{isPending ? <CustomerSourceText source={"Submitting…"} /> : <CustomerSourceText source={"Submit for review"} />}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckField({ checked, disabled, label, onCheckedChange }: { checked: boolean; disabled: boolean; label: string; onCheckedChange: (checked: boolean | 'indeterminate') => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />{label}</label>
}

function valuesFor(organization: Organization | null): RelationshipRequestFormValues {
  const kind = organization?.kind === 'Phaeno' ? 'Prospect' : (organization?.kind ?? 'Prospect')
  return { candidateOrganizationName: organization?.name ?? '', requestType: 'Onboarding', requestedOrganizationKind: kind, sourceReference: '', summary: '', pseqLabService: false, pseqKit: false }
}

export function requestedServices(values: RelationshipRequestFormValues): PortalService[] {
  if (!supportsRequestedServices(values.requestType)) return []
  return [values.pseqLabService ? 'PSeqLabService' : null, values.pseqKit ? 'PSeqKit' : null].filter((value): value is PortalService => value !== null)
}

function supportsRequestedServices(requestType: RelationshipRequestFormValues['requestType']) {
  return requestType === 'ServiceChange' || requestType === 'SalesAssistedOrder'
}
