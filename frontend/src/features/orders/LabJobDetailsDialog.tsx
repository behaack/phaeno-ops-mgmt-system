import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createLabOrder,
  getOrderErrorMessage,
  updateLabOrder,
  type LabServiceOrder,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { labSampleToWrite } from './lab-order-write'

const jobDetailsSchema = z.object({
  customerReference: z.string().trim().min(1, 'Job name is required.').max(255, 'Job name must be 255 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2,000 characters or fewer.'),
})

type JobDetailsValues = z.infer<typeof jobDetailsSchema>

type LabJobDetailsDialogProps = {
  open: boolean
  order?: LabServiceOrder | null
  onOpenChange: (open: boolean) => void
  onSaved: (order: LabServiceOrder) => void | Promise<void>
}

export function LabJobDetailsDialog({
  open,
  order,
  onOpenChange,
  onSaved,
}: LabJobDetailsDialogProps) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canCreate = Boolean(session?.capabilities.canCreateLabServiceRequests)
  const apiEnabled = authProvider !== 'mock' && canCreate
  const form = useForm<JobDetailsValues>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: { customerReference: '', description: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      customerReference: order?.customerReference ?? '',
      description: order?.description ?? '',
    })
  }, [form, open, order])

  const mutation = useMutation({
    mutationFn: async (values: JobDetailsValues) => {
      const customerReference = values.customerReference
      const description = values.description || undefined
      if (!order) {
        return createLabOrder({ customerReference, description, samples: [] })
      }

      return updateLabOrder(order.id, {
        customerReference,
        description,
        samples: order.samples.map(labSampleToWrite),
        version: order.version,
      })
    },
    onSuccess: async (savedOrder) => {
      form.reset({
        customerReference: savedOrder.customerReference,
        description: savedOrder.description ?? '',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }),
        queryClient.invalidateQueries({
          queryKey: ['lab-service-order', savedOrder.id],
        }),
      ])
      await onSaved(savedOrder)
    },
  })

  const formId = order ? `job-details-${order.id}` : 'create-lab-job'
  const editing = Boolean(order)
  const canSave = apiEnabled && (!editing || Boolean(order?.canEdit))

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit job details' : 'Job details'}
          </DialogTitle>
          <DialogDescription>
            Create the job first, then add its physical samples from the job
            detail page. Give it a recognizable internal name and do not enter
            patient names or identifiers.
          </DialogDescription>
        </DialogHeader>

        {authProvider === 'mock' ? (
          <Alert>
            <AlertTitle>Creation is paused in mock-session mode</AlertTitle>
            <AlertDescription>
              Connect a real Customer session to create a laboratory job.
            </AlertDescription>
          </Alert>
        ) : null}
        {!canCreate ? (
          <Alert variant="destructive">
            <AlertTitle>Job details cannot be changed</AlertTitle>
            <AlertDescription>
              An active Customer organization administrator is required.
            </AlertDescription>
          </Alert>
        ) : null}
        {mutation.error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Job details were not saved</AlertTitle>
            <AlertDescription>
              {getOrderErrorMessage(
                mutation.error,
                'Review the job details and try again.',
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <form
          id={formId}
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <Label htmlFor={`${formId}-reference`} className="gap-0.5">
            <span>Job name</span><span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id={`${formId}-reference`}
            className="mt-2"
            required
            aria-invalid={Boolean(form.formState.errors.customerReference)}
            aria-describedby={`${formId}-reference-help${form.formState.errors.customerReference ? ` ${formId}-reference-error` : ''}`}
            {...form.register('customerReference')}
          />
          <p id={`${formId}-reference-help`} className="mt-2 text-xs text-muted-foreground">
            Use a short name your organization will recognize. Job names must
            be unique within your organization.
          </p>
          {form.formState.errors.customerReference ? (
            <p id={`${formId}-reference-error`} className="mt-1 text-sm text-destructive" role="alert">
              {form.formState.errors.customerReference.message}
            </p>
          ) : null}

          <Label htmlFor={`${formId}-description`} className="mt-4">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id={`${formId}-description`}
            className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-invalid={Boolean(form.formState.errors.description)}
            aria-describedby={form.formState.errors.description ? `${formId}-description-error` : undefined}
            {...form.register('description')}
          />
          {form.formState.errors.description ? (
            <p id={`${formId}-description-error`} className="mt-1 text-sm text-destructive" role="alert">
              {form.formState.errors.description.message}
            </p>
          ) : null}
        </form>

        <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Required
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => requestOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={!canSave || mutation.isPending}
            >
              {mutation.isPending
                ? editing
                  ? 'Saving…'
                  : 'Creating…'
                : editing
                  ? 'Save job details'
                  : 'Create job'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  function requestOpenChange(nextOpen: boolean) {
    if (
      !nextOpen &&
      form.formState.isDirty &&
      !mutation.isPending &&
      !window.confirm('Discard the unsaved job details?')
    ) {
      return
    }
    onOpenChange(nextOpen)
  }
}
