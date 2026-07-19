import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { PortalService } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  candidateOrganizationName: z.string().trim().min(1, 'Enter the HubSpot Company name.').max(255),
  requestedOrganizationKind: z.enum(['Prospect', 'Customer', 'Partner']),
  requestedServices: z.array(z.enum(['PSeqLabService', 'PSeqKit'])),
  hubSpotCompanyId: z.string().trim().min(1, 'Enter the HubSpot Company ID.').max(100),
  hubSpotDealId: z.string().trim().min(1, 'Enter the HubSpot Deal ID.').max(100),
  summary: z.string().trim().min(1, 'Describe the requested account outcome.').max(2000),
  internalNotes: z.string().trim().max(3900),
}).superRefine((values, context) => {
  if (values.requestedOrganizationKind !== 'Prospect' && values.requestedServices.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'Select at least one requested service.',
      path: ['requestedServices'],
    })
  }
})

export type HubSpotAccountSimulationValues = z.infer<typeof schema>

const defaults: HubSpotAccountSimulationValues = {
  candidateOrganizationName: '',
  requestedOrganizationKind: 'Customer',
  requestedServices: ['PSeqLabService'],
  hubSpotCompanyId: '',
  hubSpotDealId: '',
  summary: '',
  internalNotes: '',
}

export function HubSpotAccountSimulationDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: {
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: HubSpotAccountSimulationValues) => void
  open: boolean
}) {
  const form = useForm<HubSpotAccountSimulationValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onBlur',
  })
  const requestedKind = form.watch('requestedOrganizationKind')
  const requestedServices = form.watch('requestedServices')

  useEffect(() => {
    if (open) form.reset(defaults)
  }, [form, open])

  function setService(service: PortalService, checked: boolean) {
    const next = checked
      ? [...new Set([...requestedServices, service])]
      : requestedServices.filter((value) => value !== service)
    form.setValue('requestedServices', next, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Simulate HubSpot account intake</DialogTitle>
          <DialogDescription>
            Development only. Enter the account facts HubSpot would send after an approved evaluation or Closed Won handoff. POMS will create a pending request, not an active account.
          </DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <form id="hubspot-account-simulation" className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <Field id="hubspot-account-name" label="Company name" required error={form.formState.errors.candidateOrganizationName?.message}>
            <Input id="hubspot-account-name" {...form.register('candidateOrganizationName')} />
          </Field>

          <Field id="hubspot-account-kind" label="Requested relationship" required>
            <select
              id="hubspot-account-kind"
              className={selectClass}
              value={requestedKind}
              onChange={(event) => {
                const kind = event.target.value as HubSpotAccountSimulationValues['requestedOrganizationKind']
                form.setValue('requestedOrganizationKind', kind, { shouldDirty: true, shouldValidate: true })
                form.setValue(
                  'requestedServices',
                  kind === 'Prospect' ? [] : ['PSeqLabService'],
                  { shouldDirty: true, shouldValidate: true },
                )
              }}
            >
              <option value="Prospect">Prospect evaluation</option>
              <option value="Customer">Customer</option>
              <option value="Partner">Partner</option>
            </select>
          </Field>

          {requestedKind !== 'Prospect' ? (
            <fieldset>
              <legend className="text-sm font-medium">Requested services <Required /></legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ServiceOption
                  checked={requestedServices.includes('PSeqLabService')}
                  id="hubspot-account-pseq-lab"
                  label="PSeq Lab Service"
                  onCheckedChange={(checked) => setService('PSeqLabService', checked)}
                />
                {requestedKind === 'Partner' ? (
                  <ServiceOption
                    checked={requestedServices.includes('PSeqKit')}
                    id="hubspot-account-pseq-kit"
                    label="PSeq Kit"
                    onCheckedChange={(checked) => setService('PSeqKit', checked)}
                  />
                ) : null}
              </div>
              <FieldError message={form.formState.errors.requestedServices?.message} />
            </fieldset>
          ) : (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              Prospect evaluation requests do not activate commercial service entitlements.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="hubspot-account-company-id" label="HubSpot Company ID" required error={form.formState.errors.hubSpotCompanyId?.message}>
              <Input id="hubspot-account-company-id" {...form.register('hubSpotCompanyId')} placeholder="e.g. 333656241855" />
            </Field>
            <Field id="hubspot-account-deal-id" label="HubSpot Deal ID" required error={form.formState.errors.hubSpotDealId?.message}>
              <Input id="hubspot-account-deal-id" {...form.register('hubSpotDealId')} placeholder="e.g. 335881126620" />
            </Field>
          </div>

          <Field id="hubspot-account-summary" label="Requested outcome" required error={form.formState.errors.summary?.message}>
            <textarea id="hubspot-account-summary" rows={3} className={textareaClass} {...form.register('summary')} />
          </Field>
          <Field id="hubspot-account-notes" label="Internal simulation notes" error={form.formState.errors.internalNotes?.message}>
            <textarea id="hubspot-account-notes" rows={3} className={textareaClass} {...form.register('internalNotes')} />
          </Field>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="hubspot-account-simulation" disabled={isPending}>
            {isPending ? 'Creating request…' : 'Create simulated intake'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  children,
  error,
  id,
  label,
  required,
}: {
  children: React.ReactNode
  error?: string
  id: string
  label: string
  required?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}{required ? <> <Required /></> : null}</Label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

function ServiceOption({
  checked,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean
  id: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      {label}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null
}

function Required() {
  return <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span>
}
