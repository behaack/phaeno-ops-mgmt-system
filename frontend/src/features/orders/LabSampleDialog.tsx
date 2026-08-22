import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  getOrderErrorMessage,
  updateLabOrder,
  type LabSample,
  type LabSampleWrite,
  type LabServiceOrder,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
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
import { usePhaenoSession } from '#/features/auth/session-context'
import { labSampleToWrite, readAnalysisIds } from './lab-order-write'

const STANDARD_MATERIAL_TYPE = 'extracted_rna'
const TUBE_QUANTITY_UNIT = 'tube'

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
    Boolean(session?.capabilities.canCreateLabServiceRequests) && order.canEdit
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
      const savedSample = sampleValuesToWrite(values, order, sample)
      const existingSamples = order.samples.map((item) =>
        item.id === sample?.id ? savedSample : labSampleToWrite(item),
      )
      return updateLabOrder(order.id, {
        customerReference: order.customerReference,
        description: order.description ?? undefined,
        hasMixedBiologicalSources: order.hasMixedBiologicalSources,
        sharedBiologicalSource: order.sharedBiologicalSource ?? undefined,
        storageRequirements: order.storageRequirements,
        safetyDeclaration: order.safetyDeclaration,
        samples: sample ? existingSamples : [...existingSamples, savedSample],
        version: order.version,
      })
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
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{editing ? 'Edit sample details' : 'Add sample'}</DialogTitle>
          <DialogDescription>
            Sample type: Extracted RNA. Enter the scientific intake information.
            Storage, safety, and notes are set for the job. Every sample receives
            the standard data-file set.{' '}
            {order.hasMixedBiologicalSources
              ? 'Enter this sample’s biological source.'
              : 'The shared biological source is set in Job details.'}{' '}
            Do not use patient names or direct identifiers.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65dvh] overflow-y-auto px-4">
          {mutation.error ? (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertTitle>Sample was not saved</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  'Review the sample details and try again.',
                )}
              </AlertDescription>
            </Alert>
          ) : null}
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
              {order.hasMixedBiologicalSources ? (
                <Field
                  label="Biological source"
                  id={`${formId}-source`}
                  description="The organism or species and source tissue or cell type, such as human PBMCs or mouse liver."
                  alignControl
                  required
                  error={form.formState.errors.biologicalSource?.message}
                >
                  <Input
                    id={`${formId}-source`}
                    placeholder="Human PBMCs, mouse liver…"
                    aria-invalid={Boolean(form.formState.errors.biologicalSource)}
                    aria-describedby={fieldDescriptionIds(
                      `${formId}-source`,
                      form.formState.errors.biologicalSource?.message,
                    )}
                    {...form.register('biologicalSource')}
                  />
                </Field>
              ) : null}
              <Field
                label="Quantity (tubes)"
                id={`${formId}-quantity`}
                description="The number of tubes you will send for this sample."
                alignControl={!order.hasMixedBiologicalSources}
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

function sampleValuesToWrite(
  values: SampleValues,
  order: LabServiceOrder,
  sample?: LabSample | null,
): LabSampleWrite {
  return {
    id: sample?.id,
    customerSampleId: values.customerSampleId,
    materialType: STANDARD_MATERIAL_TYPE,
    biologicalSource: order.hasMixedBiologicalSources
      ? values.biologicalSource
      : order.sharedBiologicalSource ?? '',
    quantity: values.quantity,
    quantityUnit: TUBE_QUANTITY_UNIT,
    storageRequirements: order.storageRequirements,
    safetyDeclaration: order.safetyDeclaration,
    concentration: sample?.concentration ?? null,
    notes: sample?.notes ?? null,
    analysisDefinitionIds: sample
      ? readAnalysisIds(sample.analysisDefinitionIdsJson)
      : [],
    collectionDate: sample?.collectionDate,
    replacementForSampleId: sample?.replacementForSampleId,
  }
}

function sampleToForm(
  sample: LabSample | null | undefined,
  order: LabServiceOrder,
): SampleFormInput {
  return {
    customerSampleId: sample?.customerSampleId ?? '',
    biologicalSource:
      sample?.biologicalSource ?? order.sharedBiologicalSource ?? '',
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
