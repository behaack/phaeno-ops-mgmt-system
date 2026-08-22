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
import { labSampleToWrite } from './lab-order-write'

const jobDetailsSchema = z.object({
  customerReference: z.string().trim().min(1, 'Job name is required.').max(255, 'Job name must be 255 characters or fewer.'),
  biologicalSourceMode: z.enum(['shared', 'mixed'], {
    error: 'Choose whether biological sources are shared or mixed.',
  }),
  sharedBiologicalSource: z.string().trim().max(500, 'Biological source must be 500 characters or fewer.'),
  storageRequirements: z.string().trim().min(1, 'Storage requirements are required.').max(2000, 'Storage requirements must be 2,000 characters or fewer.'),
  safetyDeclaration: z.string().trim().min(1, 'Safety declaration is required.').max(2000, 'Safety declaration must be 2,000 characters or fewer.'),
  jobNotes: z.string().trim().max(2000, 'Job notes must be 2,000 characters or fewer.'),
}).superRefine((values, context) => {
  if (values.biologicalSourceMode === 'shared' && !values.sharedBiologicalSource) {
    context.addIssue({
      code: 'custom',
      path: ['sharedBiologicalSource'],
      message: 'Biological source is required when all samples share one source.',
    })
  }
})

type JobDetailsFormInput = z.input<typeof jobDetailsSchema>
type JobDetailsValues = z.output<typeof jobDetailsSchema>

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
  const form = useForm<JobDetailsFormInput, unknown, JobDetailsValues>({
    resolver: zodResolver(jobDetailsSchema),
    defaultValues: {
      customerReference: '',
      biologicalSourceMode: undefined,
      sharedBiologicalSource: '',
      storageRequirements: '',
      safetyDeclaration: '',
      jobNotes: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      customerReference: order?.customerReference ?? '',
      biologicalSourceMode: order
        ? order.hasMixedBiologicalSources
          ? 'mixed'
          : order.sharedBiologicalSource
            ? 'shared'
            : undefined
        : undefined,
      sharedBiologicalSource: order?.sharedBiologicalSource ?? '',
      storageRequirements: order?.storageRequirements ?? '',
      safetyDeclaration: order?.safetyDeclaration ?? '',
      jobNotes: order?.description ?? '',
    })
  }, [form, open, order])

  const mutation = useMutation({
    mutationFn: async (values: JobDetailsValues) => {
      const customerReference = values.customerReference
      const description = values.jobNotes || undefined
      const hasMixedBiologicalSources = values.biologicalSourceMode === 'mixed'
      const sharedBiologicalSource = hasMixedBiologicalSources
        ? undefined
        : values.sharedBiologicalSource
      const storageRequirements = values.storageRequirements
      const safetyDeclaration = values.safetyDeclaration
      if (!order) {
        return createLabOrder({
          customerReference,
          description,
          hasMixedBiologicalSources,
          sharedBiologicalSource,
          storageRequirements,
          safetyDeclaration,
          samples: [],
        })
      }

      return updateLabOrder(order.id, {
        customerReference,
        description,
        hasMixedBiologicalSources,
        sharedBiologicalSource,
        storageRequirements,
        safetyDeclaration,
        samples: order.samples.map(labSampleToWrite),
        version: order.version,
      })
    },
    onSuccess: async (savedOrder) => {
      form.reset({
        customerReference: savedOrder.customerReference,
        biologicalSourceMode: savedOrder.hasMixedBiologicalSources
          ? 'mixed'
          : 'shared',
        sharedBiologicalSource: savedOrder.sharedBiologicalSource ?? '',
        storageRequirements: savedOrder.storageRequirements,
        safetyDeclaration: savedOrder.safetyDeclaration,
        jobNotes: savedOrder.description ?? '',
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
  const biologicalSourceMode = form.watch('biologicalSourceMode')

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit job details' : 'Job details'}
          </DialogTitle>
          <DialogDescription>
            Set the information shared by every sample in this job. Add each
            physical sample from the job detail page. Do not enter patient
            names or identifiers.
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
          onSubmit={form.handleSubmit(submit)}
        >
          <Label htmlFor={`${formId}-reference`}>
            <RequiredFieldName>Job name</RequiredFieldName>
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

          <fieldset
            className="mt-4"
            aria-describedby={`${formId}-source-mode-help${form.formState.errors.biologicalSourceMode ? ` ${formId}-source-mode-error` : ''}`}
          >
            <legend className="text-sm font-medium">
              <RequiredFieldName>
                Do all samples share the same biological source?
              </RequiredFieldName>
            </legend>
            <p id={`${formId}-source-mode-help`} className="mt-1 text-xs text-muted-foreground">
              Biological source includes the organism or species and source
              tissue or cell type.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3">
                <input
                  type="radio"
                  value="shared"
                  className="mt-0.5 size-4 accent-primary"
                  {...form.register('biologicalSourceMode')}
                />
                <span>
                  <span className="block text-sm font-medium">Yes — same source</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Enter the source once for the whole job.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-3">
                <input
                  type="radio"
                  value="mixed"
                  className="mt-0.5 size-4 accent-primary"
                  {...form.register('biologicalSourceMode')}
                />
                <span>
                  <span className="block text-sm font-medium">No — sources vary</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Enter a source for each sample.
                  </span>
                </span>
              </label>
            </div>
            {form.formState.errors.biologicalSourceMode ? (
              <p id={`${formId}-source-mode-error`} className="mt-1 text-sm text-destructive" role="alert">
                {form.formState.errors.biologicalSourceMode.message}
              </p>
            ) : null}
          </fieldset>

          {biologicalSourceMode === 'shared' ? (
            <div className="mt-4">
              <Label htmlFor={`${formId}-shared-source`}>
                <RequiredFieldName>Biological source</RequiredFieldName>
              </Label>
              <Input
                id={`${formId}-shared-source`}
                className="mt-2"
                placeholder="Human PBMCs, mouse liver…"
                aria-invalid={Boolean(form.formState.errors.sharedBiologicalSource)}
                aria-describedby={`${formId}-shared-source-help${form.formState.errors.sharedBiologicalSource ? ` ${formId}-shared-source-error` : ''}`}
                {...form.register('sharedBiologicalSource')}
              />
              <p id={`${formId}-shared-source-help`} className="mt-1 text-xs text-muted-foreground">
                This value will be copied into every sample in the job.
              </p>
              {form.formState.errors.sharedBiologicalSource ? (
                <p id={`${formId}-shared-source-error`} className="mt-1 text-sm text-destructive" role="alert">
                  {form.formState.errors.sharedBiologicalSource.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <Label htmlFor={`${formId}-storage`} className="mt-4">
            <RequiredFieldName>Storage requirements</RequiredFieldName>
          </Label>
          <textarea
            id={`${formId}-storage`}
            className="mt-2 min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
            placeholder="For example: Ship frozen on dry ice; avoid thawing."
            aria-invalid={Boolean(form.formState.errors.storageRequirements)}
            aria-describedby={`${formId}-storage-help${form.formState.errors.storageRequirements ? ` ${formId}-storage-error` : ''}`}
            {...form.register('storageRequirements')}
          />
          <p id={`${formId}-storage-help`} className="mt-1 text-xs text-muted-foreground">
            Describe the storage and transport temperature and any freeze/thaw
            limits for every sample in this job.
          </p>
          {form.formState.errors.storageRequirements ? (
            <p id={`${formId}-storage-error`} className="mt-1 text-sm text-destructive" role="alert">
              {form.formState.errors.storageRequirements.message}
            </p>
          ) : null}

          <Label htmlFor={`${formId}-safety`} className="mt-4">
            <RequiredFieldName>Safety declaration</RequiredFieldName>
          </Label>
          <textarea
            id={`${formId}-safety`}
            className="mt-2 min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
            placeholder="No known hazards"
            aria-invalid={Boolean(form.formState.errors.safetyDeclaration)}
            aria-describedby={`${formId}-safety-help${form.formState.errors.safetyDeclaration ? ` ${formId}-safety-error` : ''}`}
            {...form.register('safetyDeclaration')}
          />
          <p id={`${formId}-safety-help`} className="mt-1 text-xs text-muted-foreground">
            Identify biohazards or handling risks shared by the job. Enter “No
            known hazards” when none apply.
          </p>
          {form.formState.errors.safetyDeclaration ? (
            <p id={`${formId}-safety-error`} className="mt-1 text-sm text-destructive" role="alert">
              {form.formState.errors.safetyDeclaration.message}
            </p>
          ) : null}

          <Label htmlFor={`${formId}-notes`} className="mt-4">
            Job notes <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id={`${formId}-notes`}
            className="mt-2 min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
            aria-invalid={Boolean(form.formState.errors.jobNotes)}
            aria-describedby={`${formId}-notes-help${form.formState.errors.jobNotes ? ` ${formId}-notes-error` : ''}`}
            {...form.register('jobNotes')}
          />
          <p id={`${formId}-notes-help`} className="mt-1 text-xs text-muted-foreground">
            Add information that applies to the job as a whole. Do not include
            names or direct identifiers.
          </p>
          {form.formState.errors.jobNotes ? (
            <p id={`${formId}-notes-error`} className="mt-1 text-sm text-destructive" role="alert">
              {form.formState.errors.jobNotes.message}
            </p>
          ) : null}
        </form>

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
        </RequiredDialogFooter>
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

  function submit(values: JobDetailsValues) {
    const replacingSampleSources =
      order?.hasMixedBiologicalSources === true &&
      values.biologicalSourceMode === 'shared' &&
      order.samples.some(
        (sample) =>
          sample.biologicalSource.trim().toLocaleLowerCase() !==
          values.sharedBiologicalSource.trim().toLocaleLowerCase(),
      )

    if (
      replacingSampleSources &&
      !window.confirm(
        'Use this biological source for every sample? This replaces the source on all existing draft samples.',
      )
    ) {
      return
    }

    mutation.mutate(values)
  }
}
