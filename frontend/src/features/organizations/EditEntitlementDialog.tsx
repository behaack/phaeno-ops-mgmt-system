import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type {
  Organization,
  RelationshipRequest,
  ServiceEntitlement,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { selectClass, textareaClass } from './OrganizationFormDialog'

const schema = z.object({
  effectiveFrom: z.string().min(1, 'Select a start date.'),
  effectiveTo: z.string(),
  configurationStatus: z.enum(['Pending', 'Ready', 'Blocked']),
  sourceRequestId: z.string().trim(),
  notes: z.string().trim().max(2000),
})

export type EditEntitlementFormValues = z.infer<typeof schema>

export function EditEntitlementDialog({
  entitlement,
  error,
  isPending,
  onOpenChange,
  onSubmit,
  organization,
  requests,
}: {
  entitlement: ServiceEntitlement | null
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditEntitlementFormValues) => void
  organization: Organization
  requests: RelationshipRequest[]
}) {
  const open = Boolean(entitlement)
  const form = useForm<EditEntitlementFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(entitlement),
    mode: 'onBlur',
  })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting, open)


  useEffect(() => {
    if (entitlement) form.reset(defaults(entitlement))
  }, [entitlement, form])

  if (!entitlement) return null

  const eligibleRequests = requests.filter(
    (request) =>
      request.organizationId === organization.id &&
      (request.status === 'Approved' || request.status === 'Applied') &&
      request.requestedServices.includes(entitlement.service),
  )

  return (
    <Dialog open={open} onOpenChange={open => { if (open) (onOpenChange)(open); else void __modalGuard.close(() => (onOpenChange)(false)) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><CustomerSourceText source={"Edit service entitlement"} /></DialogTitle>
          <DialogDescription>
            <CustomerSourceText source={"Update the existing dated permission. The service itself cannot be\r\n            changed; create a separate non-overlapping entitlement for another\r\n            service."} />
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="edit-entitlement-form"
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <PortalField >
            <Label htmlFor="edit-entitlement-service"><CustomerSourceText source={"Service"} /></Label>
            <Input
              id="edit-entitlement-service"
              value={serviceLabel(entitlement.service)}
              disabled
              readOnly
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="edit-entitlement-from">
              <RequiredFieldName><CustomerSourceText source={"Effective from"} /></RequiredFieldName>
            </Label>
            <Input
              id="edit-entitlement-from"
              type="datetime-local"
              {...form.register('effectiveFrom')}
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="edit-entitlement-to"><CustomerSourceText source={"Effective to"} /></Label>
            <Input
              id="edit-entitlement-to"
              type="datetime-local"
              {...form.register('effectiveTo')}
            />
          </PortalField>
          <PortalField >
            <Label htmlFor="edit-entitlement-status">
              <RequiredFieldName><CustomerSourceText source={"Service configuration"} /></RequiredFieldName>
            </Label>
            <NativeSelect
              id="edit-entitlement-status"
              className={selectClass}
              {...form.register('configurationStatus')}
            >
              <option value="Pending"><CustomerSourceText source={"Pending"} /></option>
              <option value="Ready"><CustomerSourceText source={"Ready"} /></option>
              <option value="Blocked"><CustomerSourceText source={"Blocked"} /></option>
            </NativeSelect>
          </PortalField>
          <PortalField >
            <Label htmlFor="edit-entitlement-source">
              <CustomerSourceText source={"Approved source request"} />
            </Label>
            <NativeSelect
              id="edit-entitlement-source"
              className={selectClass}
              {...form.register('sourceRequestId')}
            >
              <option value=""><CustomerSourceText source={"No linked request"} /></option>
              {eligibleRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNumber} · {request.status} · {request.summary}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              <CustomerSourceText source={"Only approved or applied requests for this service are available."} />
            </p>
          </PortalField>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-notes"><CustomerSourceText source={"Internal notes"} /></Label>
            <textarea
              id="edit-entitlement-notes"
              className={textareaClass}
              rows={3}
              {...form.register('notes')}
            />
          </div>
        </form>
        <RequiredDialogFooter>
          <Button type="button" variant="outline" onClick={() => { void __modalGuard.close(() => (() => onOpenChange(false))()) }}>
            <CustomerSourceText source={"Cancel"} />
          </Button>
          <Button
            type="submit"
            form="edit-entitlement-form"
            disabled={isPending}
          >
            {isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Save entitlement"} />}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function defaults(
  entitlement: ServiceEntitlement | null,
): EditEntitlementFormValues {
  return {
    effectiveFrom: entitlement
      ? toLocalInput(entitlement.effectiveFrom)
      : '',
    effectiveTo: entitlement?.effectiveTo
      ? toLocalInput(entitlement.effectiveTo)
      : '',
    configurationStatus: entitlement?.configurationStatus ?? 'Pending',
    sourceRequestId: entitlement?.sourceRequestId ?? '',
    notes: entitlement?.notes ?? '',
  }
}

function toLocalInput(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

function serviceLabel(value: ServiceEntitlement['service']) {
  return value === 'PSeqLabService'
    ? 'PSeq Lab Service'
    : 'PSeq Kit (includes data assembly)'
}
