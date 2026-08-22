import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  addLabSample,
  getOrderErrorMessage,
  updateLabSample,
  type LabSample,
  type LabServiceOrder,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFeedback,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

const sampleSchema = z.object({
  customerSampleId: z
    .string()
    .trim()
    .min(1, 'Sample identifier is required.')
    .max(255),
  biologicalSource: z
    .string()
    .trim()
    .min(1, 'Biological source is required.')
    .max(500),
  quantity: z.coerce
    .number()
    .int('Quantity must be a whole number of tubes.')
    .positive('Quantity must be at least one tube.'),
})

type SampleFormInput = z.input<typeof sampleSchema>
type SampleValues = z.output<typeof sampleSchema>

type LabSampleDialogProps = {
  open: boolean
  order: LabServiceOrder
  sample?: LabSample | null
  onOpenChange: (open: boolean) => void
  onSaved: (order: LabServiceOrder) => void | Promise<void>
}

export function LabSampleDialog({
  open,
  order,
  sample,
  onOpenChange,
  onSaved,
}: LabSampleDialogProps) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canEdit =
    Boolean(session?.capabilities.canCreateLabServiceRequests) && order.canEditSamples
  const apiEnabled = authProvider !== 'mock' && canEdit
  const form = useForm<SampleFormInput, unknown, SampleValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: sampleToForm(null, order),
  })

  useEffect(() => {
    if (!open) return
    form.reset(sampleToForm(sample, order))
  }, [form, open, order, sample])

  const mutation = useMutation({
    mutationFn: (values: SampleValues) => {
      const input = {
        customerSampleId: values.customerSampleId,
        biologicalSource: values.biologicalSource,
        tubeCount: values.quantity,
        collectionDate: sample?.collectionDate,
        concentration: sample?.concentration,
        notes: sample?.notes,
      }
      return sample
        ? updateLabSample(order.id, sample.id, { ...input, version: sample.version })
        : addLabSample(order.id, { ...input, orderVersion: order.version })
    },
    onSuccess: async (savedOrder) => {
      form.reset(sampleToForm(sample, savedOrder))
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['lab-service-order', order.id],
        }),
        queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] }),
      ])
      await onSaved(savedOrder)
    },
  })

  const editing = Boolean(sample)
  const formId = sample ? `lab-sample-${sample.id}` : `lab-sample-new-${order.id}`

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 [--dialog-inset:0px]">
        <DialogHeader className="pt-4 pr-12 pl-4">
          <DialogTitle>{editing ? 'Edit sample details' : 'Add sample'}</DialogTitle>
          <DialogDescription>
            Sample type: Extracted RNA. Enter the scientific intake information.
            Storage, safety, and notes are set for the job. Every sample receives
            the standard data-file set.{' '}
            Choose one of the biological sources accepted with the Job.{' '}
            Do not use patient names or direct identifiers.
          </DialogDescription>
        </DialogHeader>

        {mutation.error ? (
          <DialogFeedback>
            <Alert variant="destructive" role="alert">
              <AlertTitle>Sample was not saved</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  'Review the sample details and try again.',
                )}
              </AlertDescription>
            </Alert>
          </DialogFeedback>
        ) : null}

        <div className="max-h-[65dvh] overflow-y-auto px-4">
          <form
            id={formId}
            noValidate
            className="space-y-5 pb-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Customer sample ID"
                id={`${formId}-identifier`}
                description="Your internal, non-patient identifier for this sample. It must be unique within this job."
                alignControl
                required
                error={form.formState.errors.customerSampleId?.message}
              >
                <Input
                  id={`${formId}-identifier`}
                  aria-invalid={Boolean(form.formState.errors.customerSampleId)}
                  aria-describedby={fieldDescriptionIds(
                    `${formId}-identifier`,
                    form.formState.errors.customerSampleId?.message,
                  )}
                  {...form.register('customerSampleId')}
                />
              </Field>
              {order.sourceGroups.length > 1 ? (
                <Field
                  label="Biological source"
                  id={`${formId}-source`}
                  description="The organism or species and source tissue or cell type, such as human PBMCs or mouse liver."
                  alignControl
                  required
                  error={form.formState.errors.biologicalSource?.message}
                >
                  <select
                    id={`${formId}-source`}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-invalid={Boolean(form.formState.errors.biologicalSource)}
                    aria-describedby={fieldDescriptionIds(
                      `${formId}-source`,
                      form.formState.errors.biologicalSource?.message,
                    )}
                    {...form.register('biologicalSource')}
                  >
                    <option value="">Select a source</option>
                    {order.sourceGroups.map((group) => <option key={group.id} value={group.biologicalSource}>{group.biologicalSource}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field
                label="Quantity (tubes)"
                id={`${formId}-quantity`}
                description="The number of tubes you will send for this sample."
                alignControl={order.sourceGroups.length === 1}
                required
                error={form.formState.errors.quantity?.message}
              >
                <Input
                  id={`${formId}-quantity`}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  aria-invalid={Boolean(form.formState.errors.quantity)}
                  aria-describedby={fieldDescriptionIds(
                    `${formId}-quantity`,
                    form.formState.errors.quantity?.message,
                  )}
                  {...form.register('quantity')}
                />
              </Field>
            </div>
          </form>
        </div>

        <RequiredDialogFooter className="border-t bg-muted/40 px-4 py-3">
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
            disabled={!apiEnabled || mutation.isPending}
          >
            {mutation.isPending
              ? 'Saving…'
              : editing
                ? 'Save sample details'
                : 'Add sample'}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )

  function requestOpenChange(nextOpen: boolean) {
    if (
      !nextOpen &&
      form.formState.isDirty &&
      !mutation.isPending &&
      !window.confirm('Discard the unsaved sample details?')
    ) {
      return
    }
    onOpenChange(nextOpen)
  }
}

function sampleToForm(
  sample: LabSample | null | undefined,
  order: LabServiceOrder,
): SampleFormInput {
  return {
    customerSampleId: sample?.customerSampleId ?? '',
    biologicalSource:
      sample?.biologicalSource ?? order.sourceGroups[0]?.biologicalSource ?? order.sharedBiologicalSource ?? '',
    quantity: sample?.quantity ?? 1,
  }
}

function Field({
  label,
  id,
  description,
  alignControl,
  required,
  error,
  children,
}: {
  label: string
  id: string
  description: string
  alignControl?: boolean
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {required ? <RequiredFieldName>{label}</RequiredFieldName> : label}
      </Label>
      <p
        id={`${id}-help`}
        className={`mt-1 text-xs text-muted-foreground${alignControl ? ' sm:min-h-8' : ''}`}
      >
        {description}
      </p>
      <div className="mt-2">{children}</div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

function fieldDescriptionIds(id: string, error?: string) {
  return `${id}-help${error ? ` ${id}-error` : ''}`
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
}
