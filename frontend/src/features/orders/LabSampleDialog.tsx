import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { getSampleSourceAvailability, getSampleSourceCapacityError, normalizeBiologicalSource } from './sample-source-capacity'

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
  biologicalSource?: string
  onOpenChange: (open: boolean) => void
  onSaved: (order: LabServiceOrder) => void | Promise<void>
}

export function LabSampleDialog({
  open,
  order,
  sample,
  biologicalSource,
  onOpenChange,
  onSaved,
}: LabSampleDialogProps) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canEdit =
    Boolean(session?.capabilities.canCreateLabServiceRequests) && order.canEditSamples
  const apiEnabled = authProvider !== 'mock' && canEdit
  const openedDraft = useRef<string | null>(null)
  const draftKey = JSON.stringify([order.id, sample?.id ?? null, sample ? null : biologicalSource ?? ''])
  const form = useForm<SampleFormInput, unknown, SampleValues>({
    resolver: zodResolver(sampleSchema.superRefine((values, context) => {
      const error = getSampleSourceCapacityError(order, values.biologicalSource, sample)
      if (error) context.addIssue({ code: 'custom', path: ['biologicalSource'], message: error })
    })),
    defaultValues: sampleToForm(sample, biologicalSource),
  })
  const selectedSource = useWatch({ control: form.control, name: 'biologicalSource' })
  const sourceOptions = getSampleSourceAvailability(order, sample)
  const selectedGroup = sourceOptions.find(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(selectedSource))
  const selectedSourceKnown = sourceOptions.some(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(selectedSource))
  const originalSourceUnknown = Boolean(sample && !sourceOptions.some(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(sample.biologicalSource)))

  useEffect(() => {
    if (!open) { openedDraft.current = null; return }
    if (openedDraft.current !== draftKey) {
      openedDraft.current = draftKey
      form.reset(sampleToForm(sample, biologicalSource))
    }
  }, [biologicalSource, draftKey, form, open, sample])

  const mutation = useMutation({
    mutationFn: (values: SampleValues) => {
      const input = {
        customerSampleId: values.customerSampleId,
        biologicalSource: order.sourceGroups.find(group => normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(values.biologicalSource))?.biologicalSource ?? values.biologicalSource,
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
      form.reset(sampleToForm(sample, biologicalSource))
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
  const isDirty = form.formState.isDirty
  const formId = sample ? `lab-sample-${sample.id}` : `lab-sample-new-${order.id}`

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit sample details' : 'Add sample'}</DialogTitle>
          <DialogDescription>
            Enter the details for one extracted RNA sample.
          </DialogDescription>
          {!editing ? <p className="wrap-anywhere text-sm text-muted-foreground">Biological source: <span className="font-medium text-foreground">{selectedSource || 'No source selected'}</span>{selectedGroup?.remaining === 0 ? ' · Full' : ''}</p> : null}
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

        <div>
          <form
            id={formId}
            noValidate
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => { if (apiEnabled && !mutation.isPending) mutation.mutate(values) })}
          >
            {!editing ? <FieldError id={`${formId}-source-error`} message={form.formState.errors.biologicalSource?.message} /> : null}
            <div className="space-y-4">
              <Field
                label="Customer sample ID"
                id={`${formId}-identifier`}
                description="Use an internal ID unique to this Job. Do not enter patient names or direct identifiers."
                required
                error={form.formState.errors.customerSampleId?.message}
              >
                <Input
                  id={`${formId}-identifier`}
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.customerSampleId)}
                  aria-describedby={fieldDescriptionIds(
                    `${formId}-identifier`,
                    form.formState.errors.customerSampleId?.message,
                  )}
                  {...form.register('customerSampleId')}
                />
              </Field>
              {editing ? (
                <Field
                  label="Biological source"
                  id={`${formId}-source`}
                  description="Select one of the biological sources accepted with this Job."
                  required
                  error={form.formState.errors.biologicalSource?.message}
                >
                  <select
                    id={`${formId}-source`}
                    disabled={mutation.isPending}
                    className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-invalid={Boolean(form.formState.errors.biologicalSource)}
                    aria-describedby={fieldDescriptionIds(
                      `${formId}-source`,
                      form.formState.errors.biologicalSource?.message,
                    )}
                    {...form.register('biologicalSource')}
                  >
                    <option value="">Select a source</option>
                    {originalSourceUnknown && sample ? <option value={sample.biologicalSource}>{sample.biologicalSource} · Not in the accepted list</option> : null}
                    {selectedSource && !selectedSourceKnown && (!sample || normalizeBiologicalSource(selectedSource) !== normalizeBiologicalSource(sample.biologicalSource)) ? <option value={selectedSource}>{selectedSource} · Not in the accepted list</option> : null}
                    {sourceOptions.map((group) => <option key={group.id} value={normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(selectedSource) ? selectedSource : group.biologicalSource} disabled={group.remaining === 0 && !group.isOriginalSource}>{group.biologicalSource}{group.remaining === 0 ? ' · Full' : ` · ${group.remaining} sample${group.remaining === 1 ? '' : 's'} remaining`}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field
                label="Quantity (tubes)"
                id={`${formId}-quantity`}
                description="The number of tubes you will send for this sample."
                required
                error={form.formState.errors.quantity?.message}
              >
                <Input
                  id={`${formId}-quantity`}
                  disabled={mutation.isPending}
                  className="max-w-32"
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
            <p className="border-t pt-4 text-xs text-muted-foreground">
              Storage, safety, and notes are set for the Job. Each sample receives
              the standard data-file set.
            </p>
          </form>
        </div>

        <RequiredDialogFooter>
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
    if (!nextOpen && mutation.isPending) return
    if (
      !nextOpen &&
      isDirty &&
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
  biologicalSource?: string,
): SampleFormInput {
  return {
    customerSampleId: sample?.customerSampleId ?? '',
    biologicalSource: sample?.biologicalSource ?? biologicalSource ?? '',
    quantity: sample?.quantity ?? 1,
  }
}

function Field({
  label,
  id,
  description,
  required,
  error,
  children,
}: {
  label: string
  id: string
  description: string
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
        className="mt-1 text-xs text-muted-foreground"
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
