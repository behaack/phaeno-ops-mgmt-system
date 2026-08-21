import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  getOrderErrorMessage,
  listAnalysisDefinitions,
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

const sampleSchema = z.object({
  customerSampleId: z
    .string()
    .trim()
    .min(1, 'Sample identifier is required.')
    .max(255),
  materialType: z
    .string()
    .trim()
    .min(1, 'Material type is required.')
    .max(255),
  biologicalSource: z
    .string()
    .trim()
    .min(1, 'Biological source is required.')
    .max(500),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
  quantityUnit: z
    .string()
    .trim()
    .min(1, 'Quantity unit is required.')
    .max(100),
  storageRequirements: z
    .string()
    .trim()
    .min(1, 'Storage requirements are required.')
    .max(2000),
  safetyDeclaration: z
    .string()
    .trim()
    .min(1, 'Safety declaration is required.')
    .max(2000),
  concentration: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  notes: z.string().trim().max(4000).optional(),
  analysisDefinitionIds: z
    .array(z.string().uuid())
    .min(1, 'Select at least one analysis.'),
})

type SampleFormInput = z.input<typeof sampleSchema>
type SampleValues = z.output<typeof sampleSchema>

const emptySample: SampleFormInput = {
  customerSampleId: '',
  materialType: '',
  biologicalSource: '',
  quantity: 1,
  quantityUnit: 'tube',
  storageRequirements: '',
  safetyDeclaration: '',
  concentration: '',
  notes: '',
  analysisDefinitionIds: [],
}

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
  const analyses = useQuery({
    queryKey: ['order-catalog', 'analyses'],
    queryFn: listAnalysisDefinitions,
    enabled: apiEnabled && open,
  })
  const form = useForm<SampleFormInput, unknown, SampleValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: emptySample,
  })

  useEffect(() => {
    if (!open) return
    form.reset(sample ? sampleToForm(sample) : emptySample)
  }, [form, open, sample])

  const mutation = useMutation({
    mutationFn: (values: SampleValues) => {
      const savedSample = sampleValuesToWrite(values, sample)
      const existingSamples = order.samples.map((item) =>
        item.id === sample?.id ? savedSample : labSampleToWrite(item),
      )
      return updateLabOrder(order.id, {
        customerReference: order.customerReference,
        description: order.description ?? undefined,
        samples: sample ? existingSamples : [...existingSamples, savedSample],
        version: order.version,
      })
    },
    onSuccess: async (savedOrder) => {
      form.reset(sample ? sampleToForm(sample) : emptySample)
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
            Enter scientific intake information and select every requested
            analysis. Do not use patient names or direct identifiers.
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
          {analyses.error ? (
            <Alert variant="destructive" className="mb-4" role="alert">
              <AlertTitle>Requested analyses could not be loaded</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  analyses.error,
                  'Close the sample and try again.',
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
                required
                error={form.formState.errors.customerSampleId?.message}
              >
                <Input
                  id={`${formId}-identifier`}
                  {...form.register('customerSampleId')}
                />
              </Field>
              <Field
                label="Material type"
                id={`${formId}-material`}
                required
                error={form.formState.errors.materialType?.message}
              >
                <Input
                  id={`${formId}-material`}
                  placeholder="RNA, tissue, extract…"
                  {...form.register('materialType')}
                />
              </Field>
              <Field
                label="Biological source"
                id={`${formId}-source`}
                required
                error={form.formState.errors.biologicalSource?.message}
              >
                <Input
                  id={`${formId}-source`}
                  {...form.register('biologicalSource')}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Quantity"
                  id={`${formId}-quantity`}
                  required
                  error={form.formState.errors.quantity?.message}
                >
                  <Input
                    id={`${formId}-quantity`}
                    type="number"
                    step="any"
                    {...form.register('quantity')}
                  />
                </Field>
                <Field
                  label="Unit"
                  id={`${formId}-unit`}
                  required
                  error={form.formState.errors.quantityUnit?.message}
                >
                  <Input
                    id={`${formId}-unit`}
                    {...form.register('quantityUnit')}
                  />
                </Field>
              </div>
              <Field
                label="Concentration (optional)"
                id={`${formId}-concentration`}
                error={form.formState.errors.concentration?.message}
              >
                <Input
                  id={`${formId}-concentration`}
                  type="number"
                  step="any"
                  {...form.register('concentration')}
                />
              </Field>
            </div>
            <Field
              label="Storage requirements"
              id={`${formId}-storage`}
              required
              error={form.formState.errors.storageRequirements?.message}
            >
              <textarea
                id={`${formId}-storage`}
                {...form.register('storageRequirements')}
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </Field>
            <Field
              label="Safety declaration"
              id={`${formId}-safety`}
              required
              error={form.formState.errors.safetyDeclaration?.message}
            >
              <textarea
                id={`${formId}-safety`}
                {...form.register('safetyDeclaration')}
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </Field>
            <Field
              label="Notes (optional)"
              id={`${formId}-notes`}
              error={form.formState.errors.notes?.message}
            >
              <textarea
                id={`${formId}-notes`}
                {...form.register('notes')}
                className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium">
                <RequiredFieldName>Requested analyses</RequiredFieldName>
              </legend>
              {analyses.isLoading ? (
                <p className="mt-2 text-sm text-muted-foreground" role="status">
                  Loading analyses…
                </p>
              ) : null}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(analyses.data ?? []).map((analysis) => (
                  <label
                    key={analysis.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      value={analysis.id}
                      {...form.register('analysisDefinitionIds')}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {analysis.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {analysis.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError
                message={form.formState.errors.analysisDefinitionIds?.message}
              />
            </fieldset>
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
            disabled={!apiEnabled || mutation.isPending || analyses.isLoading}
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
  sample?: LabSample | null,
): LabSampleWrite {
  return {
    id: sample?.id,
    customerSampleId: values.customerSampleId,
    materialType: values.materialType,
    biologicalSource: values.biologicalSource,
    quantity: values.quantity,
    quantityUnit: values.quantityUnit,
    storageRequirements: values.storageRequirements,
    safetyDeclaration: values.safetyDeclaration,
    concentration:
      values.concentration === '' ? null : (values.concentration ?? null),
    notes: values.notes || null,
    analysisDefinitionIds: values.analysisDefinitionIds,
    collectionDate: sample?.collectionDate,
    replacementForSampleId: sample?.replacementForSampleId,
  }
}

function sampleToForm(sample: LabSample): SampleFormInput {
  return {
    customerSampleId: sample.customerSampleId,
    materialType: sample.materialType,
    biologicalSource: sample.biologicalSource,
    quantity: sample.quantity,
    quantityUnit: sample.quantityUnit,
    storageRequirements: sample.storageRequirements,
    safetyDeclaration: sample.safetyDeclaration,
    concentration: sample.concentration ?? '',
    notes: sample.notes ?? '',
    analysisDefinitionIds: readAnalysisIds(sample.analysisDefinitionIdsJson),
  }
}

function Field({
  label,
  id,
  required,
  error,
  children,
}: {
  label: string
  id: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {required ? <RequiredFieldName>{label}</RequiredFieldName> : label}
      </Label>
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
}
