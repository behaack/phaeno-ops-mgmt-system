import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
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
  sequencingRunCount: z.coerce.number().int("Use a whole number.").min(1, "Enter at least one run.").max(10000),
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
  const __customerText = useCustomerText()

  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const canEdit =
    Boolean(session?.capabilities.canCreateLabServiceRequests) && order.canEditSamples
  const apiEnabled = authProvider !== 'mock' && canEdit
  const oneRunPerSample = (order.requestedSequencingRunCount ?? order.requestedSpecimenCount) === order.requestedSpecimenCount
  const openedDraft = useRef<string | null>(null)
  const draftKey = JSON.stringify([order.id, sample?.id ?? null, sample ? null : biologicalSource ?? ''])
  const form = useForm<SampleFormInput, unknown, SampleValues>({
    resolver: zodResolver(sampleSchema.superRefine((values, context) => {
      const error = getSampleSourceCapacityError(order, values.biologicalSource, sample)
      if (error) context.addIssue({ code: 'custom', path: ['biologicalSource'], message: error })
    })),
    defaultValues: sampleToForm(sample, biologicalSource),
  })
  const { isDirty: __formDraftDirty } = form.formState

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
        sequencingRunCount: oneRunPerSample ? 1 : values.sequencingRunCount,
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
  const isDirty = __formDraftDirty
  const formId = sample ? `lab-sample-${sample.id}` : `lab-sample-new-${order.id}`

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? <CustomerSourceText source={"Edit sample details"} /> : __customerText('m_90d2f8e365a1')}</DialogTitle>
          <DialogDescription>
            <CustomerText message="m_93e933817d1f" /></DialogDescription>
          {!editing ? <p className="wrap-anywhere text-sm text-muted-foreground"><CustomerText message="m_9390ba966400" /><span className="font-medium text-foreground">{selectedSource || 'No source selected'}</span>{selectedGroup?.remaining === 0 ? <CustomerSourceText source={" · Full"} /> : ''}</p> : null}
        </DialogHeader>

        {mutation.error ? (
          <DialogFeedback>
            <Alert variant="destructive" role="alert">
              <AlertTitle><CustomerText message="m_714be1deddfb" /></AlertTitle>
              <AlertDescription>
                {<CustomerSourceText source={getOrderErrorMessage(
                  mutation.error,
                  'Review the sample details and try again.',
                )} />}
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
                label={__customerText('m_8c82df187fe2')}
                id={`${formId}-identifier`}
                description={__customerText('m_834f37294beb')}
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
                  label={__customerText('m_62cda8311410')}
                  id={`${formId}-source`}
                  description={__customerText('m_ccafc789d0e9')}
                  required
                  error={form.formState.errors.biologicalSource?.message}
                >
                  <NativeSelect
                    id={`${formId}-source`}
                    disabled={mutation.isPending}
                    className="w-full"
                    aria-invalid={Boolean(form.formState.errors.biologicalSource)}
                    aria-describedby={fieldDescriptionIds(
                      `${formId}-source`,
                      form.formState.errors.biologicalSource?.message,
                    )}
                    {...form.register('biologicalSource')}
                  >
                    <option value=""><CustomerText message="m_76a093e985c3" /></option>
                    {originalSourceUnknown && sample ? <option value={sample.biologicalSource}>{sample.biologicalSource} <CustomerText message="m_a2e7c0e390e5" /></option> : null}
                    {selectedSource && !selectedSourceKnown && (!sample || normalizeBiologicalSource(selectedSource) !== normalizeBiologicalSource(sample.biologicalSource)) ? <option value={selectedSource}>{selectedSource} <CustomerText message="m_a2e7c0e390e5" /></option> : null}
                    {sourceOptions.map((group) => <option key={group.id} value={normalizeBiologicalSource(group.biologicalSource) === normalizeBiologicalSource(selectedSource) ? selectedSource : group.biologicalSource} disabled={group.remaining === 0 && !group.isOriginalSource}>{group.biologicalSource}{group.remaining === 0 ? <CustomerSourceText source={" · Full"} /> : __customerText('m_cbafff5b8c4c', { p0: String(group.remaining), p1: String(group.remaining === 1 ? '' : 's') })}</option>)}
                  </NativeSelect>
                </Field>
              ) : null}
              {oneRunPerSample ? <div className="space-y-1">
                <Label htmlFor={`${formId}-runs`}><CustomerText message="m_c358e314e75b" /></Label>
                <output id={`${formId}-runs`} className="block text-sm">1</output>
                <p className="text-xs text-muted-foreground"><CustomerText message="m_f4b6377ae6d2" /></p>
              </div> : <Field label={__customerText('m_c358e314e75b')} id={`${formId}-runs`} required
                description={__customerText('m_31e1f7307e62', { p0: String(order.requestedSequencingRunCount ?? order.requestedSpecimenCount) })}
                error={form.formState.errors.sequencingRunCount?.message}>
                <Input id={`${formId}-runs`} type="number" min={1} max={10000} step={1} inputMode="numeric" disabled={mutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.sequencingRunCount)} aria-describedby={fieldDescriptionIds(`${formId}-runs`, form.formState.errors.sequencingRunCount?.message)} {...form.register('sequencingRunCount')} />
              </Field>}
              <Field
                label={__customerText('m_aa1cebf669cf')}
                id={`${formId}-quantity`}
                description={__customerText('m_5efdd7a7691b')}
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
              <CustomerText message="m_87465a700b26" /></p>
          </form>
        </div>

        <RequiredDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => requestOpenChange(false)}
          >
            <CustomerText message="m_19766ed6ccb2" /></Button>
          <Button
            type="submit"
            form={formId}
            disabled={!apiEnabled || mutation.isPending}
          >
            {mutation.isPending
              ? <CustomerSourceText source={"Saving…"} />
              : editing
                ? "Save sample details"
                : __customerText('m_90d2f8e365a1')}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )

  async function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && mutation.isPending) return
    if (
      !nextOpen &&
      isDirty &&
      !mutation.isPending &&
      !(await confirmPortal('Discard the unsaved sample details?'))
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
    sequencingRunCount: sample?.sequencingRunCount ?? 1,
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
      {<CustomerSourceText source={message} />}
    </p>
  ) : null
}
