import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type {
  Organization,
  RelationshipRequest,
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
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { selectClass, textareaClass } from './OrganizationFormDialog'
import { OrderingAuthorizationField } from './OrderingAuthorizationField'

export type RequestAction = 'approve' | 'decline' | 'apply' | 'cancel'

const schema = z.object({
  explanation: z
    .string()
    .trim()
    .min(1, 'Record the reason or completed work.')
    .max(2000),
  organizationId: z.string(),
  orderingAuthorized: z.boolean(),
})

type Values = z.infer<typeof schema>

export function RequestActionDialog({
  action,
  error,
  isPending,
  onOpenChange,
  onSubmit,
  organizations = [],
  request,
}: {
  action: RequestAction | null
  error?: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { explanation: string; organizationId?: string; orderingAuthorized: boolean }) => void
  organizations?: Organization[]
  request: RelationshipRequest | null
}) {
  const open = Boolean(action && request)
  const form = useForm<Values>({
    defaultValues: { explanation: '', organizationId: '', orderingAuthorized: true },
    mode: 'onBlur',
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) form.reset({ explanation: '', organizationId: request?.organizationId ?? '', orderingAuthorized: true })
  }, [form, open, request?.organizationId])

  if (!action || !request) return null

  const createsAccountOnApproval = action === 'approve'
    && !request.organizationId
    && (request.requestType === 'Onboarding' || request.requestType === 'Evaluation')
    && (request.requestedOrganizationKind === 'Prospect' || request.requestedOrganizationKind === 'Customer' || request.requestedOrganizationKind === 'Partner')
  const createsCustomerAccount = createsAccountOnApproval
    && request.requestedOrganizationKind === 'Customer'
  const content = actionContent(action, createsAccountOnApproval)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>
            {content.description} Request {request.requestNumber} for{' '}
            {request.candidateOrganizationName}.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id="request-action-form"
          className="grid gap-1.5"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            if (action === 'apply' && !request.organizationId && !values.organizationId) {
              form.setError('organizationId', {
                message: 'Select the organization completed from this request.',
              })
              return
            }

            onSubmit({
              explanation: values.explanation,
              organizationId: values.organizationId || undefined,
              orderingAuthorized: values.orderingAuthorized,
            })
          })}
        >
          {action === 'apply' && !request.organizationId ? (
            <div className="mb-3 grid gap-1.5">
              <Label htmlFor="request-action-organization">
                <RequiredFieldName>Completed organization</RequiredFieldName>
              </Label>
              <select
                id="request-action-organization"
                className={selectClass}
                aria-invalid={Boolean(form.formState.errors.organizationId)}
                {...form.register('organizationId')}
              >
                <option value="">Select organization</option>
                {organizations
                  .filter((organization) => organization.isActive && organization.kind !== 'Phaeno')
                  .map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} ({organization.kind})
                    </option>
                  ))}
              </select>
              {form.formState.errors.organizationId ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.organizationId.message}
                </p>
              ) : null}
            </div>
          ) : null}
          {createsCustomerAccount ? (
            <div className="mb-3">
              <OrderingAuthorizationField
                id="request-action-ordering-authorized"
                checked={form.watch('orderingAuthorized')}
                disabled={isPending}
                onCheckedChange={(checked) => form.setValue('orderingAuthorized', checked, { shouldDirty: true })}
              />
            </div>
          ) : null}
          <Label htmlFor="request-action-explanation">
            <RequiredFieldName>{content.label}</RequiredFieldName>
          </Label>
          <textarea
            id="request-action-explanation"
            className={textareaClass}
            rows={4}
            aria-invalid={Boolean(form.formState.errors.explanation)}
            {...form.register('explanation')}
          />
          {form.formState.errors.explanation ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.explanation.message}
            </p>
          ) : null}
        </form>
        <RequiredDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Keep unchanged
          </Button>
          <Button
            type="submit"
            form="request-action-form"
            variant={action === 'decline' || action === 'cancel' ? 'destructive' : 'default'}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : content.submitLabel}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function actionContent(action: RequestAction, createsAccountOnApproval: boolean) {
  switch (action) {
    case 'approve':
      return createsAccountOnApproval
        ? {
            title: 'Approve and create Portal account',
            description: 'Approval creates the account with pending Portal readiness. Customer ordering authorization follows the selection below; users and orders are not created.',
            label: 'Approval reason',
            submitLabel: 'Approve and create account',
          }
        : {
            title: 'Approve Portal request',
            description: 'Approval records the decision but does not provision access, services, or an order.',
            label: 'Approval reason',
            submitLabel: 'Approve request',
          }
    case 'decline':
      return {
        title: 'Decline Portal request',
        description: 'The request will close without applying any operational change.',
        label: 'Decline reason',
        submitLabel: 'Decline request',
      }
    case 'apply':
      return {
        title: 'Complete account request',
        description: 'Confirm the owning organization, invitation, entitlement, or order work was completed first.',
        label: 'Completed work',
        submitLabel: 'Complete request',
      }
    case 'cancel':
      return {
        title: 'Cancel Portal request',
        description: 'The request will close without applying further operational change.',
        label: 'Cancellation reason',
        submitLabel: 'Cancel request',
      }
  }
}
