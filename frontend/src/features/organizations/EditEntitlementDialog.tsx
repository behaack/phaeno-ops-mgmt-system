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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit service entitlement</DialogTitle>
          <DialogDescription>
            Update the existing dated permission. The service itself cannot be
            changed; create a separate non-overlapping entitlement for another
            service.
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
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-service">Service</Label>
            <Input
              id="edit-entitlement-service"
              value={serviceLabel(entitlement.service)}
              disabled
              readOnly
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-from">
              <RequiredFieldName>Effective from</RequiredFieldName>
            </Label>
            <Input
              id="edit-entitlement-from"
              type="datetime-local"
              {...form.register('effectiveFrom')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-to">Effective to</Label>
            <Input
              id="edit-entitlement-to"
              type="datetime-local"
              {...form.register('effectiveTo')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-status">
              <RequiredFieldName>Service configuration</RequiredFieldName>
            </Label>
            <select
              id="edit-entitlement-status"
              className={selectClass}
              {...form.register('configurationStatus')}
            >
              <option value="Pending">Pending</option>
              <option value="Ready">Ready</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-source">
              Approved source request
            </Label>
            <select
              id="edit-entitlement-source"
              className={selectClass}
              {...form.register('sourceRequestId')}
            >
              <option value="">No linked request</option>
              {eligibleRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNumber} · {request.status} · {request.summary}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Only approved or applied requests for this service are available.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-entitlement-notes">Internal notes</Label>
            <textarea
              id="edit-entitlement-notes"
              className={textareaClass}
              rows={3}
              {...form.register('notes')}
            />
          </div>
        </form>
        <RequiredDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-entitlement-form"
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save entitlement'}
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
